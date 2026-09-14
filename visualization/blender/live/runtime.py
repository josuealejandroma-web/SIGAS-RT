"""One timer bridges the transport queue to Blender's main thread."""

from collections import deque
import json
from pathlib import Path
import time

import bpy

from .replay import load_replay
from .telemetry_receiver import TelemetryReceiver, send_command
from .telemetry_state import TelemetryState
from .visual_controller import VisualController, main_thread_only

REPO = Path(__file__).resolve().parents[3]


class LiveRuntime:
    def __init__(self, port=45701, command_port=45702, clock=time.monotonic):
        self.clock = clock
        self.receiver = TelemetryReceiver(port=port, clock=clock)
        self.command_port = command_port
        self.session = TelemetryState(clock)
        self.controller = None
        self.source = "SIN DATOS"
        self.active = False
        self.status = "Recepcion detenida"
        self.catalog = json.loads((REPO / "visualization/scenarios/scenario_catalog.json").read_text(encoding="utf-8"))["commands"]
        self.tick_callback = self.tick
        self.history = deque(maxlen=256)
        self.replay_frames = []
        self.replay_index = 0
        self.replay_started = 0
        self.replay_paused = False
        self.pause_started = 0

    def start(self, replay=False):
        main_thread_only()
        wanted = "RECORDED REPLAY" if replay else "LIVE WOKWI"
        if self.active and self.source == wanted:
            return
        self.stop()
        self.session = TelemetryState(self.clock)
        self.history.clear()
        self.source = wanted
        try:
            if replay:
                _, self.replay_frames = load_replay(REPO / "visualization/godot/data/wokwi_recorded_replay.jsonl")
                self.replay_index = 0
                self.replay_started = self.clock()
                self.replay_paused = False
            else:
                self.receiver.start()
            self.controller = VisualController()
            self.active = True
            self.status = "Replay historico" if replay else "Esperando telemetria UDP"
            if not bpy.app.timers.is_registered(self.tick_callback):
                bpy.app.timers.register(self.tick_callback, first_interval=0.05)
        except BaseException:
            self.stop()
            self.status = "No se pudo iniciar; revisar puerto y modelo"
            raise
        self.redraw()

    def stop(self):
        main_thread_only()
        self.active = False
        if bpy.app.timers.is_registered(self.tick_callback):
            bpy.app.timers.unregister(self.tick_callback)
        self.receiver.stop()
        if self.controller is not None:
            self.controller.restore()
            self.controller = None
        self.status = "Recepcion detenida; estado conservado"
        self.redraw()

    def command(self, command):
        main_thread_only()
        if command not in self.catalog:
            raise ValueError("Comando fuera del catalogo")
        self.start()
        send_command(command, self.catalog, self.command_port)
        self.session.timing = None
        self.session.last_timing = None
        self.status = "Solicitud UDP enviada: " + self.catalog[command]["label"]

    def pause_replay(self):
        main_thread_only()
        if self.source != "RECORDED REPLAY" or not self.active:
            return
        self.replay_paused = not self.replay_paused
        if self.replay_paused:
            self.pause_started = self.clock()
        else:
            self.replay_started += self.clock() - self.pause_started

    def tick(self):
        main_thread_only()
        if not self.active:
            return None
        try:
            now = self.clock()
            if self.source == "RECORDED REPLAY":
                packets = []
                elapsed = now - self.replay_started
                while (not self.replay_paused and self.replay_index < len(self.replay_frames)
                       and self.replay_frames[self.replay_index][0] <= elapsed):
                    packets.append((self.replay_frames[self.replay_index][1], now))
                    self.replay_index += 1
                self.status = "Replay pausado" if self.replay_paused else (
                    "Replay finalizado" if self.replay_index == len(self.replay_frames) else "Replay historico")
            else:
                packets = self.receiver.drain()
                if self.receiver.error or not self.receiver.running:
                    raise RuntimeError("Receptor UDP detenido inesperadamente")
            for data, received_at in packets:
                frame = self.session.accept(data, received_at)
                if frame is None:
                    continue
                self.history.append(frame)
                if frame["type"] == "state":
                    self.controller.apply(frame, now)
                if self.source == "LIVE WOKWI":
                    self.status = "Telemetria recibida del bridge"
            fresh = (not self.replay_paused if self.source == "RECORDED REPLAY"
                     else self.session.connection(now) == "LIVE")
            self.controller.animate(now, fresh)
            self.redraw()
            return 0.05
        except Exception as exc:
            self.stop()
            self.status = "LIVE detenido: " + str(exc)
            return None

    def connection(self):
        if not self.active or self.source != "LIVE WOKWI":
            return "DISCONNECTED"
        return self.session.connection()

    def redraw(self):
        main_thread_only()
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == "VIEW_3D":
                    area.tag_redraw()

