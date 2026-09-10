"""Bridge local entre Wokwi CLI y Godot para SIGAS-RT."""

from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

from scenario_runner import ScenarioCatalog, ScenarioError, WokwiScenarioRunner
from telemetry_parser import TelemetryError, parse_line

DEFAULT_GODOT_HOST = "127.0.0.1"
DEFAULT_GODOT_PORT = 45701
DEFAULT_COMMAND_PORT = 45702
PROCESS_STOP_TIMEOUT_SECONDS = 2.0


class Bridge:
    def __init__(
        self,
        catalog: ScenarioCatalog,
        runner: WokwiScenarioRunner,
        godot_host: str,
        godot_port: int,
        command_port: int,
        timeout_ms: int,
        socket_factory=None,
        process_stop_timeout: float = PROCESS_STOP_TIMEOUT_SECONDS,
    ) -> None:
        self.catalog = catalog
        self.runner = runner
        self.godot_endpoint = (godot_host, godot_port)
        self.command_port = command_port
        self.timeout_ms = timeout_ms
        self.socket_factory = socket_factory or socket.socket
        self.process_stop_timeout = process_stop_timeout
        self.telemetry_socket = self.socket_factory(socket.AF_INET, socket.SOCK_DGRAM)
        self.listener_socket = None
        self.stop_event = threading.Event()
        self.current_process = None
        self.telemetry_thread = None
        self.worker_thread = None
        self.pending_scenario = None
        self.request_generation = 0
        self.condition = threading.Condition()
        self.process_stop_lock = threading.Lock()
        self.shutdown_lock = threading.Lock()
        self.shutdown_complete = False

    def run(self) -> None:
        try:
            self.listener_socket = self.socket_factory(socket.AF_INET, socket.SOCK_DGRAM)
            self.listener_socket.bind(("127.0.0.1", self.command_port))
            self.listener_socket.settimeout(0.5)
            self._start_worker()
            print(f"[BRIDGE] listening on 127.0.0.1:{self.command_port}")
            print("[BRIDGE] allowed commands: " + ", ".join(self.catalog.commands()))
            while not self.stop_event.is_set():
                try:
                    data, _ = self.listener_socket.recvfrom(256)
                except socket.timeout:
                    continue
                except OSError:
                    if self.stop_event.is_set():
                        break
                    raise
                command = data.decode("utf-8", errors="replace").strip()
                try:
                    scenario = self.catalog.resolve(command)
                except ScenarioError as exc:
                    print(f"[BRIDGE] rejected command: {exc}")
                    continue
                self.request_scenario(scenario)
        finally:
            self.shutdown()

    def request_scenario(self, scenario) -> bool:
        with self.condition:
            if self.stop_event.is_set():
                return False
            self.request_generation += 1
            self.pending_scenario = (self.request_generation, scenario)
            process = self.current_process
            self.condition.notify_all()
        if process is not None:
            self._stop_process(process)
        return True

    def _start_worker(self) -> None:
        with self.condition:
            if self.worker_thread is not None and self.worker_thread.is_alive():
                return
            if self.stop_event.is_set():
                return
            self.worker_thread = threading.Thread(
                target=self._worker_loop,
                name="SIGAS-ScenarioWorker",
            )
            self.worker_thread.start()

    def _worker_loop(self) -> None:
        while not self.stop_event.is_set():
            with self.condition:
                self.condition.wait_for(
                    lambda: self.pending_scenario is not None
                    or self.stop_event.is_set()
                )
                if self.stop_event.is_set():
                    return
                generation, scenario = self.pending_scenario
                self.pending_scenario = None
            try:
                self._run_scenario(scenario, generation)
            except Exception as exc:
                print(f"[BRIDGE] scenario worker failed: {exc}")

    def _run_scenario(self, scenario, generation: int) -> None:
        print(f"[BRIDGE] running {scenario.command}: {scenario.scenario.name}")
        try:
            running = self.runner.start(scenario, self.timeout_ms)
        except ScenarioError as exc:
            print(f"[BRIDGE] {exc}")
            return
        except Exception as exc:  # Runner failures must not strand the worker.
            print(f"[BRIDGE] runner failed: {exc}")
            return

        process = running.process
        with self.condition:
            superseded = (
                self.stop_event.is_set()
                or generation != self.request_generation
            )
            if not superseded:
                self.current_process = process
        if superseded:
            self._stop_process(process)
            return

        telemetry_thread = threading.Thread(
            target=self._tail_serial_log,
            args=(running.serial_log, process),
            name="SIGAS-TelemetryTail",
        )
        with self.condition:
            self.telemetry_thread = telemetry_thread

        exit_code = None
        telemetry_started = False
        try:
            telemetry_thread.start()
            telemetry_started = True
            if process.stdout is not None:
                for line in process.stdout:
                    print(line.rstrip())
            exit_code = process.wait()
        finally:
            if process.poll() is None:
                self._stop_process(process)
            if telemetry_started:
                telemetry_thread.join()
            with self.condition:
                if self.current_process is process:
                    self.current_process = None
                if self.telemetry_thread is telemetry_thread:
                    self.telemetry_thread = None
        if exit_code is not None:
            print(f"[BRIDGE] scenario finished with exit code {exit_code}")

    def _stop_process(self, process) -> None:
        with self.process_stop_lock:
            try:
                if process.poll() is not None:
                    return
                process.terminate()
                try:
                    process.wait(timeout=self.process_stop_timeout)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=self.process_stop_timeout)
            except (OSError, ProcessLookupError):
                return

    def shutdown(self) -> None:
        with self.shutdown_lock:
            if self.shutdown_complete:
                return
            self.stop_event.set()
            listener = self.listener_socket
            if listener is not None:
                listener.close()
            with self.condition:
                self.pending_scenario = None
                self.request_generation += 1
                process = self.current_process
                self.condition.notify_all()
            if process is not None:
                self._stop_process(process)
            worker = self.worker_thread
            if worker is not None and worker is not threading.current_thread():
                worker.join()
            telemetry = self.telemetry_thread
            if telemetry is not None and telemetry is not threading.current_thread():
                telemetry.join()
            self.telemetry_socket.close()
            self.shutdown_complete = True

    def _tail_serial_log(self, serial_log: Path, process) -> None:
        deadline = time.time() + 30.0
        while (
            not self.stop_event.is_set()
            and not serial_log.exists()
            and process.poll() is None
            and time.time() < deadline
        ):
            time.sleep(0.05)
        if not serial_log.exists():
            print(f"[BRIDGE] serial log not found: {serial_log.name}")
            return

        with serial_log.open("r", encoding="utf-8", errors="replace") as handle:
            pending = ""
            while not self.stop_event.is_set() and process.poll() is None:
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
            try:
                self.telemetry_socket.sendto(
                    frame.to_json().encode("utf-8"), self.godot_endpoint
                )
            except OSError:
                if not self.stop_event.is_set():
                    raise


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

    bridge = None
    try:
        catalog = ScenarioCatalog(args.catalog.resolve(), args.simulation_dir.resolve())
        runner = WokwiScenarioRunner(
            args.wokwi_cli.resolve(),
            args.simulation_dir.resolve(),
            repo_root,
        )
        bridge = Bridge(
            catalog,
            runner,
            args.godot_host,
            args.godot_port,
            args.command_port,
            args.timeout_ms,
        )
        bridge.run()
    except KeyboardInterrupt:
        return 130
    except ScenarioError as exc:
        print(f"[BRIDGE] {exc}", file=sys.stderr)
        return 2
    finally:
        if bridge is not None:
            bridge.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
