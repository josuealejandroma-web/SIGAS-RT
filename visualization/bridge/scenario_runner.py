"""Escenarios permitidos para el bridge local SIGAS-RT."""

from __future__ import annotations

import json
import os
import subprocess
import time
import shutil
from dataclasses import dataclass
from pathlib import Path

from firmware_artifacts import (
    FirmwareArtifactError,
    PreparedArtifacts,
    prepare_wokwi_artifacts,
    validate_prepared_artifacts,
    validate_wokwi_configuration,
)


class ScenarioError(ValueError):
    """Raised when a scenario command is not allowed."""


@dataclass(frozen=True)
class Scenario:
    command: str
    label: str
    scenario: Path
    description: str
    env: str


@dataclass(frozen=True)
class RunningScenario:
    process: subprocess.Popen[str]
    serial_log: Path


class ScenarioCatalog:
    def __init__(self, catalog_path: Path, simulation_dir: Path) -> None:
        self.catalog_path = catalog_path
        self.simulation_dir = simulation_dir
        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
        self._aliases = {
            str(alias).strip().upper(): str(target).strip().upper()
            for alias, target in raw.get("aliases", {}).items()
        }
        self._commands: dict[str, Scenario] = {}
        for command, item in raw.get("commands", {}).items():
            scenario_name = str(item["scenario"])
            scenario_path = (simulation_dir / scenario_name).resolve()
            if not scenario_path.is_file():
                raise ScenarioError(f"scenario not found: {scenario_name}")
            self._commands[command] = Scenario(
                command=command,
                label=str(item.get("label", command)),
                scenario=scenario_path,
                description=str(item.get("description", "")),
                env=str(item.get("env", "esp32doit-devkit-v1-visualization")),
            )

    def commands(self) -> list[str]:
        return sorted(self._commands) + sorted(self._aliases)

    def resolve(self, command: str) -> Scenario:
        normalized = command.strip().upper()
        normalized = self._aliases.get(normalized, normalized)
        if normalized not in self._commands:
            raise ScenarioError(f"command not allowed: {normalized}")
        if any(term in normalized for term in ("VALVE", "BUZZER", "LED", "ACTUATOR", "SERVO")):
            raise ScenarioError("direct actuator commands are not allowed")
        return self._commands[normalized]


class WokwiScenarioRunner:
    def __init__(self, wokwi_cli: Path, simulation_dir: Path, repo_root: Path, platformio: Path | None = None) -> None:
        self.wokwi_cli = wokwi_cli
        self.simulation_dir = simulation_dir
        self.repo_root = repo_root
        self.platformio = platformio

    def start(self, scenario: Scenario, timeout_ms: int) -> RunningScenario:
        if not self._has_wokwi_token():
            raise ScenarioError("WOKWI_CLI_TOKEN is not configured")
        if not self.wokwi_cli.is_file():
            raise ScenarioError(f"wokwi-cli not found: {self.wokwi_cli}")
        prepared = self._build_environment(scenario.env)
        try:
            prepared = validate_prepared_artifacts(self.repo_root, scenario.env)
            validate_wokwi_configuration(self.simulation_dir, prepared)
        except FirmwareArtifactError as exc:
            raise ScenarioError(str(exc)) from exc
        serial_log = self.simulation_dir / f"wokwi-serial-bridge-{int(time.time() * 1000)}.log"
        if serial_log.exists():
            serial_log.unlink()
        command = [
            str(self.wokwi_cli),
            "--timeout",
            str(timeout_ms),
            "--scenario",
            scenario.scenario.name,
            "--serial-log-file",
            serial_log.name,
            ".",
        ]
        process = subprocess.Popen(
            command,
            cwd=self.simulation_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=os.environ.copy(),
        )
        return RunningScenario(process=process, serial_log=serial_log)

    def _build_environment(self, env_name: str) -> PreparedArtifacts:
        platformio = self._platformio_command()
        result = subprocess.run(
            [str(platformio), "run", "-e", env_name],
            cwd=self.repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode != 0:
            raise ScenarioError(f"PlatformIO build failed for {env_name}\n{result.stdout}")
        try:
            return prepare_wokwi_artifacts(self.repo_root, env_name)
        except FirmwareArtifactError as exc:
            raise ScenarioError(str(exc)) from exc

    def _platformio_command(self) -> Path:
        if self.platformio and self.platformio.exists():
            return self.platformio
        local = self.repo_root / ".venv" / "Scripts" / "platformio.exe"
        if local.exists():
            return local
        found = shutil.which("platformio")
        if found:
            return Path(found)
        raise ScenarioError("PlatformIO not found")

    def _has_wokwi_token(self) -> bool:
        if os.environ.get("WOKWI_CLI_TOKEN"):
            return True
        if os.name != "nt":
            return False
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                token, _ = winreg.QueryValueEx(key, "WOKWI_CLI_TOKEN")
        except OSError:
            return False
        if not token:
            return False
        os.environ["WOKWI_CLI_TOKEN"] = str(token)
        return True
