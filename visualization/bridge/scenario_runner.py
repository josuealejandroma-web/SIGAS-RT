"""Escenarios permitidos para el bridge local SIGAS-RT."""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path


class ScenarioError(ValueError):
    """Raised when a scenario command is not allowed."""


@dataclass(frozen=True)
class Scenario:
    command: str
    label: str
    scenario: Path
    description: str


class ScenarioCatalog:
    def __init__(self, catalog_path: Path, simulation_dir: Path) -> None:
        self.catalog_path = catalog_path
        self.simulation_dir = simulation_dir
        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
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
            )

    def commands(self) -> list[str]:
        return sorted(self._commands)

    def resolve(self, command: str) -> Scenario:
        normalized = command.strip().upper()
        if normalized not in self._commands:
            raise ScenarioError(f"command not allowed: {normalized}")
        if any(term in normalized for term in ("VALVE", "BUZZER", "LED", "ACTUATOR", "SERVO")):
            raise ScenarioError("direct actuator commands are not allowed")
        return self._commands[normalized]


class WokwiScenarioRunner:
    def __init__(self, wokwi_cli: Path, simulation_dir: Path) -> None:
        self.wokwi_cli = wokwi_cli
        self.simulation_dir = simulation_dir

    def start(self, scenario: Scenario, timeout_ms: int) -> subprocess.Popen[str]:
        if not os.environ.get("WOKWI_CLI_TOKEN"):
            raise ScenarioError("WOKWI_CLI_TOKEN is not configured")
        if not self.wokwi_cli.is_file():
            raise ScenarioError(f"wokwi-cli not found: {self.wokwi_cli}")
        command = [
            str(self.wokwi_cli),
            "--timeout",
            str(timeout_ms),
            "--scenario",
            scenario.scenario.name,
            ".",
        ]
        return subprocess.Popen(
            command,
            cwd=self.simulation_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=os.environ.copy(),
        )
