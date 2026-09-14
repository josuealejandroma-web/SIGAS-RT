import ast
import json
from pathlib import Path
import queue
import socket
import sys
import threading
import time
import unittest

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO))
from visualization.blender.live.telemetry_receiver import TelemetryReceiver, send_command
from visualization.blender.live.telemetry_state import TelemetryState, validate_payload
from visualization.blender.live.replay import load_replay


def state_frame(**changes):
    frame = dict(type="state", seq=1, state="SYSTEM_NORMAL", action="NORMAL", reason="SELFTEST",
                 zone1_adc=410, zone2_adc=420, zone1_level="NORMAL", zone2_level="NORMAL",
                 reset=False, valve="OPEN", buzzer=False, green_led=True, red_led=False,
                 sample_us=1000000, decision_us=1000060, deadline_us=500000)
    frame.update(changes)
    return frame


def timing_frame(**changes):
    frame = dict(type="timing", seq=2, t_critical_confirmed_us=1000000,
                 t_actuator_received_us=1020000, response_us=20000, deadline_us=500000, result="PASS")
    frame.update(changes)
    return frame


class SessionTests(unittest.TestCase):
    def test_freshness_boundaries_keep_received_actuators(self):
        session = TelemetryState()
        self.assertEqual(session.connection(0), "DISCONNECTED")
        frame = state_frame(state="SYSTEM_NORMAL", valve="CLOSED", buzzer=True, green_led=False)
        session.accept(json.dumps(frame).encode(), 10)
        for now, expected in ((11.499, "LIVE"), (11.5, "STALE"), (12.999, "STALE"), (13, "DISCONNECTED")):
            self.assertEqual(session.connection(now), expected)
            self.assertEqual(session.state, frame)

    def test_invalid_packets_never_refresh(self):
        session = TelemetryState()
        session.accept(json.dumps(state_frame()).encode(), 10)
        packets = [b'null', b'[]', b'no json', b'\xff', b'{"type":"timing","result":"PASS"}',
                   json.dumps(state_frame(green_led=1)).encode(), json.dumps(state_frame(zone1_adc=-1)).encode(),
                   json.dumps(state_frame(state="UNKNOWN")).encode()]
        for packet in packets:
            self.assertIsNone(session.accept(packet, 100))
        self.assertEqual(session.last_valid, 10)
        self.assertEqual(session.connection(100), "DISCONNECTED")
        self.assertIsNone(session.timing)

    def test_timing_requires_consistent_complete_fields(self):
        for key in timing_frame():
            frame = timing_frame()
            del frame[key]
            with self.assertRaises(ValueError):
                validate_payload(frame)
        for changes in (dict(response_us=5), dict(result="FAIL"), dict(seq=True),
                        dict(deadline_us=0), dict(t_actuator_received_us=0)):
            with self.assertRaises(ValueError):
                validate_payload(timing_frame(**changes))
        self.assertEqual(validate_payload(timing_frame())["result"], "PASS")
        self.assertEqual(validate_payload(timing_frame(t_actuator_received_us=1500001,
                         response_us=500001, result="FAIL"))["result"], "FAIL")

    def test_restart_clears_previous_timing(self):
        session = TelemetryState()
        for frame in (state_frame(), timing_frame(), state_frame(sample_us=100)):
            session.accept(json.dumps(frame).encode(), 1)
        self.assertIsNone(session.timing)

    def test_replay_is_historical_and_valid(self):
        meta, frames = load_replay(REPO / "visualization/godot/data/wokwi_recorded_replay.jsonl")
        self.assertEqual(meta['evidence_scope'], 'historical visualization only')
        self.assertGreater(len(frames), 5)
        for _, data in frames:
            self.assertIsNotNone(TelemetryState().accept(data))


class TransportTests(unittest.TestCase):
    def test_udp_lifecycle_and_exclusive_bind(self):
        receiver = TelemetryReceiver(port=0)
        try:
            self.assertTrue(receiver.start())
            thread = receiver.worker
            self.assertFalse(receiver.start())
            self.assertIs(thread, receiver.worker)
            self.assertTrue(thread.daemon)
            contender = TelemetryReceiver(port=receiver.port)
            with self.assertRaises(OSError):
                contender.start()
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
                peer.sendto(json.dumps(state_frame()).encode(), ('127.0.0.1', receiver.port))
            packet, timestamp = receiver.queue.get(timeout=2)
            self.assertEqual(json.loads(packet)["type"], "state")
            self.assertLessEqual(timestamp, time.monotonic())
        finally:
            receiver.stop()
            receiver.stop()
        self.assertFalse(thread.is_alive())
        self.assertIsNone(receiver.socket)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
            peer.bind(('127.0.0.1', receiver.port))

    def test_bounded_queue_and_old_receive_time(self):
        receiver = TelemetryReceiver(port=0, capacity=2, clock=lambda: 10)
        try:
            receiver.start()
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
                for _ in range(10):
                    peer.sendto(json.dumps(state_frame()).encode(), ('127.0.0.1', receiver.port))
            deadline = time.monotonic() + 2
            while receiver.dropped < 8 and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertEqual(receiver.queue.qsize(), 2)
            self.assertEqual(receiver.dropped, 8)
            session = TelemetryState()
            for data, stamp in receiver.drain():
                session.accept(data, stamp)
            self.assertEqual(session.connection(14), "DISCONNECTED")
        finally:
            receiver.stop()

    def test_commands_from_catalog_only(self):
        catalog = json.loads((REPO / 'visualization/scenarios/scenario_catalog.json').read_text(encoding='utf-8'))['commands']
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
            peer.bind(('127.0.0.1', 0))
            peer.settimeout(1)
            for command in catalog:
                send_command(command, catalog, peer.getsockname()[1])
                self.assertEqual(peer.recv(256).decode(), command)
            with self.assertRaises(ValueError):
                send_command('OPEN_VALVE', catalog, peer.getsockname()[1])

    def test_receiver_has_no_bpy_dependencies(self):
        source = (REPO / 'visualization/blender/live/telemetry_receiver.py').read_text()
        tree = ast.parse(source)
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module)
        self.assertEqual(set(imports), {'queue', 'socket', 'threading', 'time'})
        self.assertNotIn('bpy', {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)})


if __name__ == '__main__':
    unittest.main()

