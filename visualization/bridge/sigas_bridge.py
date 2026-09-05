"""Bridge local entre Wokwi CLI y Godot para SIGAS-RT."""

from __future__ import annotations

import argparse
import socket
import sys
import threading
import time
from pathlib import Path

from scenario_runner import ScenarioCatalog, ScenarioError, WokwiScenarioRunner
from telemetry_parser import TelemetryError, parse_line

DEFAULT_GODOT_HOST = "127.0.0.1"
DEFAULT_GODOT_PORT = 45701
DEFAULT_COMMAND_PORT = 45702


class Bridge:
    def __init__(
        self,
        catalog: ScenarioCatalog,
        runner: WokwiScenarioRunner,
        godot_host: str,
        godot_port: int,
        command_port: int,
        timeout_ms: int,
    ) -> None:
        self.catalog = catalog
        self.runner = runner
        self.godot_endpoint = (godot_host, godot_port)
        self.command_port = command_port
        self.timeout_ms = timeout_ms
        self.telemetry_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.stop_event = threading.Event()
        self.current_process = None
        self.lock = threading.Lock()

    def run(self) -> None:
        listener = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        listener.bind(("127.0.0.1", self.command_port))
        listener.settimeout(0.5)
        print(f"[BRIDGE] listening on 127.0.0.1:{self.command_port}")
        print("[BRIDGE] allowed commands: " + ", ".join(self.catalog.commands()))
        while not self.stop_event.is_set():
            try:
                data, _ = listener.recvfrom(256)
            except socket.timeout:
                continue
            command = data.decode("utf-8", errors="replace").strip()
            try:
                scenario = self.catalog.resolve(command)
            except ScenarioError as exc:
                print(f"[BRIDGE] rejected command: {exc}")
                continue
            threading.Thread(target=self._run_scenario, args=(scenario,), daemon=True).start()

    def _run_scenario(self, scenario) -> None:
        with self.lock:
            if self.current_process and self.current_process.poll() is None:
                self.current_process.terminate()
            print(f"[BRIDGE] running {scenario.command}: {scenario.scenario.name}")
            try:
                running = self.runner.start(scenario, self.timeout_ms)
            except ScenarioError as exc:
                print(f"[BRIDGE] {exc}")
                return
            process = running.process
            self.current_process = process

        telemetry_thread = threading.Thread(
            target=self._tail_serial_log, args=(running.serial_log, process), daemon=True
        )
        telemetry_thread.start()
        assert process.stdout is not None
        for line in process.stdout:
            clean_line = line.rstrip()
            print(clean_line)
        exit_code = process.wait()
        telemetry_thread.join(timeout=2.0)
        print(f"[BRIDGE] scenario finished with exit code {exit_code}")

    def _tail_serial_log(self, serial_log: Path, process) -> None:
        deadline = time.time() + 30.0
        while not serial_log.exists() and process.poll() is None and time.time() < deadline:
            time.sleep(0.05)
        if not serial_log.exists():
            print(f"[BRIDGE] serial log not found: {serial_log.name}")
            return

        with serial_log.open("r", encoding="utf-8", errors="replace") as handle:
            pending = ""
            while process.poll() is None:
                chunk = handle.read()
                if not chunk:
                    time.sleep(0.05)
                    continue
                pending = self._publish_complete_lines(pending + chunk)
            while True:
                chunk = handle.read()
                if not chunk:
                    break
                pending = self._publish_complete_lines(pending + chunk)
            if pending.strip():
                self._publish_serial_line(pending.strip())

    def _publish_complete_lines(self, text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        if "\n" not in normalized:
            return normalized
        lines = normalized.split("\n")
        for line in lines[:-1]:
            self._publish_serial_line(line.strip())
        return lines[-1]

    def _publish_serial_line(self, line: str) -> None:
        try:
            frame = parse_line(line)
        except (TelemetryError, ValueError) as exc:
            print(f"[BRIDGE] dropped telemetry: {exc}")
            return
        if frame is not None:
            self.telemetry_socket.sendto(frame.to_json().encode("utf-8"), self.godot_endpoint)


def main(argv: list[str] | None = None) -> int:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="SIGAS-RT local Wokwi-Godot bridge")
    parser.add_argument("--catalog", type=Path, default=repo_root / "visualization" / "scenarios" / "scenario_catalog.json")
    parser.add_argument("--simulation-dir", type=Path, default=repo_root / "simulation")
    parser.add_argument("--wokwi-cli", type=Path, default=repo_root / "tools" / "wokwi-cli.exe")
    parser.add_argument("--godot-host", default=DEFAULT_GODOT_HOST)
    parser.add_argument("--godot-port", type=int, default=DEFAULT_GODOT_PORT)
    parser.add_argument("--command-port", type=int, default=DEFAULT_COMMAND_PORT)
    parser.add_argument("--timeout-ms", type=int, default=30000)
    args = parser.parse_args(argv)

    try:
        catalog = ScenarioCatalog(args.catalog.resolve(), args.simulation_dir.resolve())
        runner = WokwiScenarioRunner(
            args.wokwi_cli.resolve(),
            args.simulation_dir.resolve(),
            repo_root,
        )
        Bridge(catalog, runner, args.godot_host, args.godot_port, args.command_port, args.timeout_ms).run()
    except KeyboardInterrupt:
        return 130
    except ScenarioError as exc:
        print(f"[BRIDGE] {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
