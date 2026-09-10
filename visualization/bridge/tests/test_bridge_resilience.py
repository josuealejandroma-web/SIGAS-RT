import json
import socket
import subprocess
import tempfile
import threading
import time
import unittest
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sigas_bridge import Bridge
from test_parser import valid_state_payload


class FakeSocket:
    def __init__(self, receive_exception=None):
        self.receive_exception = receive_exception
        self.closed = False
        self.bound = None

    def bind(self, endpoint):
        self.bound = endpoint

    def settimeout(self, _timeout):
        pass

    def recvfrom(self, _size):
        if self.receive_exception is not None:
            raise self.receive_exception
        raise socket.timeout

    def sendto(self, _data, _endpoint):
        return None

    def close(self):
        self.closed = True


class FakeProcess:
    def __init__(self, terminate_exits=True):
        self.terminate_exits = terminate_exits
        self.done = threading.Event()
        self.returncode = None
        self.terminate_calls = 0
        self.kill_calls = 0
        self.stdout = self

    def __iter__(self):
        return self

    def __next__(self):
        while not self.done.wait(0.005):
            pass
        raise StopIteration

    def poll(self):
        return self.returncode if self.done.is_set() else None

    def terminate(self):
        self.terminate_calls += 1
        if self.terminate_exits:
            self.finish(-15)

    def kill(self):
        self.kill_calls += 1
        self.finish(-9)

    def wait(self, timeout=None):
        if not self.done.wait(timeout):
            raise subprocess.TimeoutExpired("fake-wokwi", timeout)
        return self.returncode

    def finish(self, returncode=0):
        self.returncode = returncode
        self.done.set()


class FakeRunner:
    def __init__(self, serial_log, fail=False, terminate_exits=True):
        self.serial_log = serial_log
        self.fail = fail
        self.terminate_exits = terminate_exits
        self.processes = []
        self.max_active = 0
        self.start_calls = 0

    def start(self, _scenario, _timeout_ms):
        self.start_calls += 1
        if self.fail:
            raise RuntimeError("runner failure")
        process = FakeProcess(self.terminate_exits)
        self.processes.append(process)
        active = sum(item.poll() is None for item in self.processes)
        self.max_active = max(self.max_active, active)
        return SimpleNamespace(process=process, serial_log=self.serial_log)


class BridgeResilienceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.serial_log = Path(self.temporary.name) / "serial.log"
        self.bridges = []

    def tearDown(self):
        for bridge in self.bridges:
            bridge.shutdown()
        self.temporary.cleanup()

    def _bridge(self, runner, socket_factory=None):
        telemetry_socket = FakeSocket()
        factory = socket_factory or (lambda *_args: telemetry_socket)
        bridge = Bridge(
            mock.Mock(),
            runner,
            "127.0.0.1",
            45701,
            45702,
            1000,
            socket_factory=factory,
            process_stop_timeout=0.01,
        )
        bridge._test_telemetry_socket = telemetry_socket
        bridge._start_worker()
        self.bridges.append(bridge)
        return bridge

    def _scenario(self, command):
        return SimpleNamespace(command=command, scenario=Path(command + ".yaml"))

    def _wait_until(self, predicate, timeout=1.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if predicate():
                return True
            time.sleep(0.005)
        return predicate()

    def test_a02_07_bridge_continues_after_invalid_input(self):
        bridge = Bridge.__new__(Bridge)
        bridge.telemetry_socket = mock.Mock()
        bridge.godot_endpoint = ("127.0.0.1", 45701)

        bridge._publish_serial_line("@SIGAS null")
        bridge._publish_serial_line("[TIMING]")
        bridge._publish_serial_line("@SIGAS " + json.dumps(valid_state_payload()))

        bridge.telemetry_socket.sendto.assert_called_once()

    def test_m04_01_one_request_creates_one_active_scenario(self):
        runner = FakeRunner(self.serial_log)
        bridge = self._bridge(runner)

        self.assertTrue(bridge.request_scenario(self._scenario("ONE")))

        self.assertTrue(self._wait_until(lambda: bridge.current_process is not None))
        self.assertEqual(runner.start_calls, 1)
        self.assertEqual(sum(p.poll() is None for p in runner.processes), 1)

    def test_m04_02_second_request_cancels_before_next_process(self):
        runner = FakeRunner(self.serial_log)
        bridge = self._bridge(runner)
        bridge.request_scenario(self._scenario("ONE"))
        self.assertTrue(self._wait_until(lambda: bridge.current_process is not None))
        first = runner.processes[0]

        bridge.request_scenario(self._scenario("TWO"))

        self.assertTrue(self._wait_until(lambda: len(runner.processes) == 2))
        self.assertGreaterEqual(first.terminate_calls, 1)
        self.assertEqual(runner.max_active, 1)

    def test_m04_03_shutdown_terminates_and_kills_as_fallback(self):
        runner = FakeRunner(self.serial_log, terminate_exits=False)
        bridge = self._bridge(runner)
        bridge.request_scenario(self._scenario("ONE"))
        self.assertTrue(self._wait_until(lambda: bridge.current_process is not None))
        process = runner.processes[0]

        bridge.shutdown()

        self.assertGreaterEqual(process.terminate_calls, 1)
        self.assertEqual(process.kill_calls, 1)
        self.assertFalse(bridge.worker_thread.is_alive())

    def test_m04_04_shutdown_closes_listener_and_telemetry_sockets(self):
        runner = FakeRunner(self.serial_log)
        bridge = self._bridge(runner)
        listener = FakeSocket()
        bridge.listener_socket = listener

        bridge.shutdown()

        self.assertTrue(listener.closed)
        self.assertTrue(bridge._test_telemetry_socket.closed)

    def test_m04_05_keyboard_interrupt_executes_cleanup(self):
        sockets = [FakeSocket(), FakeSocket(KeyboardInterrupt())]

        def socket_factory(*_args):
            return sockets.pop(0)

        runner = FakeRunner(self.serial_log)
        bridge = Bridge(
            mock.Mock(commands=mock.Mock(return_value=[])),
            runner,
            "127.0.0.1",
            45701,
            45702,
            1000,
            socket_factory=socket_factory,
        )
        telemetry_socket = bridge.telemetry_socket
        self.bridges.append(bridge)

        with self.assertRaises(KeyboardInterrupt):
            bridge.run()

        self.assertTrue(bridge.listener_socket.closed)
        self.assertTrue(telemetry_socket.closed)
        self.assertFalse(bridge.worker_thread.is_alive())

    def test_m04_06_runner_exception_leaves_no_active_worker_after_shutdown(self):
        runner = FakeRunner(self.serial_log, fail=True)
        bridge = self._bridge(runner)
        bridge.request_scenario(self._scenario("FAIL"))
        self.assertTrue(self._wait_until(lambda: runner.start_calls == 1))
        self.assertIsNone(bridge.current_process)

        bridge.shutdown()

        self.assertFalse(bridge.worker_thread.is_alive())

    def test_m04_07_telemetry_thread_terminates_with_process(self):
        self.serial_log.write_text("", encoding="utf-8")
        runner = FakeRunner(self.serial_log)
        bridge = self._bridge(runner)
        bridge.request_scenario(self._scenario("ONE"))
        self.assertTrue(self._wait_until(lambda: bridge.telemetry_thread is not None))

        runner.processes[0].finish(0)

        self.assertTrue(
            self._wait_until(
                lambda: bridge.telemetry_thread is None
                and bridge.current_process is None
            )
        )

    def test_m04_08_rapid_requests_use_one_bounded_worker(self):
        runner = FakeRunner(self.serial_log)
        bridge = self._bridge(runner)
        worker = bridge.worker_thread

        for index in range(25):
            bridge.request_scenario(self._scenario(f"RUN_{index}"))

        self.assertTrue(self._wait_until(lambda: runner.start_calls >= 1))
        self.assertIs(bridge.worker_thread, worker)
        self.assertTrue(worker.is_alive())
        self.assertEqual(runner.max_active, 1)
        self.assertLessEqual(
            sum(t.name == "SIGAS-ScenarioWorker" for t in threading.enumerate()),
            1,
        )


if __name__ == "__main__":
    unittest.main()
