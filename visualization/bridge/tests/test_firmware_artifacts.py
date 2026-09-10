import json
import tempfile
import unittest
from pathlib import Path
import sys
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firmware_artifacts import (
    FirmwareArtifactError,
    prepare_wokwi_artifacts,
    resolve_environment_artifacts,
    validate_prepared_artifacts,
    validate_wokwi_configuration,
)
from scenario_runner import WokwiScenarioRunner


class FirmwareArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.repo_root = Path(self.temporary_directory.name)
        self.simulation_dir = self.repo_root / "simulation"
        self.simulation_dir.mkdir()
        (self.simulation_dir / "wokwi.toml").write_text(
            "[wokwi]\n"
            "version = 1\n"
            'firmware = "../.pio/wokwi/current/firmware-merged.bin"\n'
            'elf = "../.pio/wokwi/current/firmware.elf"\n',
            encoding="utf-8",
        )

    def create_environment(self, environment, marker):
        build_dir = self.repo_root / ".pio" / "build" / environment
        build_dir.mkdir(parents=True)
        (build_dir / "firmware.bin").write_bytes(f"bin-{marker}".encode())
        (build_dir / "firmware-merged.bin").write_bytes(
            f"merged-{marker}".encode()
        )
        (build_dir / "firmware.elf").write_bytes(f"elf-{marker}".encode())

    def test_alternates_normal_visualization_normal_without_stale_bin(self):
        normal = "esp32doit-devkit-v1"
        visual = "esp32doit-devkit-v1-visualization"
        self.create_environment(normal, "normal")
        self.create_environment(visual, "visual")

        for environment, marker in (
            (normal, b"normal"),
            (visual, b"visual"),
            (normal, b"normal"),
        ):
            prepared = prepare_wokwi_artifacts(self.repo_root, environment)
            validate_wokwi_configuration(self.simulation_dir, prepared)
            self.assertEqual(prepared.environment, environment)
            self.assertEqual(prepared.firmware_bin.read_bytes(), b"bin-" + marker)
            self.assertEqual(
                prepared.firmware_merged_bin.read_bytes(), b"merged-" + marker
            )
            self.assertEqual(prepared.firmware_elf.read_bytes(), b"elf-" + marker)

    def test_rejects_missing_bin_or_elf(self):
        environment = "esp32doit-devkit-v1"
        self.create_environment(environment, "normal")
        artifacts = resolve_environment_artifacts(self.repo_root, environment)

        artifacts.firmware_bin.unlink()
        with self.assertRaisesRegex(FirmwareArtifactError, "BIN not found"):
            resolve_environment_artifacts(self.repo_root, environment)

        artifacts.firmware_bin.write_bytes(b"bin-normal")
        artifacts.firmware_elf.unlink()
        with self.assertRaisesRegex(FirmwareArtifactError, "ELF not found"):
            resolve_environment_artifacts(self.repo_root, environment)

    def test_rejects_requested_environment_different_from_manifest(self):
        normal = "esp32doit-devkit-v1"
        visual = "esp32doit-devkit-v1-visualization"
        self.create_environment(normal, "normal")
        self.create_environment(visual, "visual")
        prepare_wokwi_artifacts(self.repo_root, normal)

        with self.assertRaisesRegex(FirmwareArtifactError, "prepared=esp32"):
            validate_prepared_artifacts(self.repo_root, visual)

    def test_rejects_manifest_with_artifacts_from_different_environment(self):
        normal = "esp32doit-devkit-v1"
        visual = "esp32doit-devkit-v1-visualization"
        self.create_environment(normal, "normal")
        self.create_environment(visual, "visual")
        prepared = prepare_wokwi_artifacts(self.repo_root, normal)
        manifest = json.loads(prepared.manifest.read_text(encoding="utf-8"))
        manifest["source"]["firmware_elf"] = (
            f".pio/build/{visual}/firmware.elf"
        )
        prepared.manifest.write_text(json.dumps(manifest), encoding="utf-8")

        with self.assertRaisesRegex(FirmwareArtifactError, "do not match"):
            validate_prepared_artifacts(self.repo_root, normal)

    def test_rejects_wokwi_config_outside_prepared_pair(self):
        environment = "esp32doit-devkit-v1"
        self.create_environment(environment, "normal")
        prepared = prepare_wokwi_artifacts(self.repo_root, environment)
        (self.simulation_dir / "wokwi.toml").write_text(
            "[wokwi]\n"
            'firmware = "../.pio/wokwi/current/firmware-merged.bin"\n'
            f'elf = "../.pio/build/{environment}/firmware.elf"\n',
            encoding="utf-8",
        )

        with self.assertRaisesRegex(FirmwareArtifactError, "prepared ELF"):
            validate_wokwi_configuration(self.simulation_dir, prepared)

    def test_runner_propagates_requested_environment_to_build_and_staging(self):
        environment = "esp32doit-devkit-v1-visualization"
        self.create_environment(environment, "visual")
        platformio = self.repo_root / "platformio"
        platformio.write_text("test executable", encoding="utf-8")
        runner = WokwiScenarioRunner(
            self.repo_root / "wokwi-cli",
            self.simulation_dir,
            self.repo_root,
            platformio,
        )

        completed = mock.Mock(returncode=0, stdout="")
        with mock.patch("scenario_runner.subprocess.run", return_value=completed) as run:
            prepared = runner._build_environment(environment)

        self.assertEqual(prepared.environment, environment)
        self.assertEqual(
            run.call_args.args[0],
            [str(platformio), "run", "-e", environment],
        )
        validate_wokwi_configuration(self.simulation_dir, prepared)


if __name__ == "__main__":
    unittest.main()
