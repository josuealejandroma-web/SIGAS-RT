"""Exercise the real PlatformIO artifacts without starting Wokwi."""

from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BRIDGE_DIR = REPO_ROOT / "visualization" / "bridge"
sys.path.insert(0, str(BRIDGE_DIR))

from firmware_artifacts import (  # noqa: E402
    prepare_wokwi_artifacts,
    resolve_environment_artifacts,
    validate_wokwi_configuration,
)


NORMAL_ENVIRONMENT = "esp32doit-devkit-v1"
VISUAL_ENVIRONMENT = "esp32doit-devkit-v1-visualization"


def main() -> int:
    simulation_dir = REPO_ROOT / "simulation"
    normal = resolve_environment_artifacts(REPO_ROOT, NORMAL_ENVIRONMENT)
    visual = resolve_environment_artifacts(REPO_ROOT, VISUAL_ENVIRONMENT)
    if normal.firmware_bin.read_bytes() == visual.firmware_bin.read_bytes():
        raise RuntimeError("normal and visualization BINs cannot discriminate A04")
    if normal.firmware_elf.read_bytes() == visual.firmware_elf.read_bytes():
        raise RuntimeError("normal and visualization ELFs cannot discriminate A04")

    for environment in (
        NORMAL_ENVIRONMENT,
        VISUAL_ENVIRONMENT,
        NORMAL_ENVIRONMENT,
    ):
        source = resolve_environment_artifacts(REPO_ROOT, environment)
        prepared = prepare_wokwi_artifacts(REPO_ROOT, environment)
        validate_wokwi_configuration(simulation_dir, prepared)
        if prepared.firmware_bin.read_bytes() != source.firmware_bin.read_bytes():
            raise RuntimeError(f"stale BIN selected for {environment}")
        if prepared.firmware_elf.read_bytes() != source.firmware_elf.read_bytes():
            raise RuntimeError(f"stale ELF selected for {environment}")

    print("A04-ARTIFACT-SEQUENCE: PASS normal -> visualization -> normal")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
