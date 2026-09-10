"""Resolve and stage matching PlatformIO artifacts for local Wokwi runs."""

from __future__ import annotations

import argparse
import filecmp
import json
import os
import shutil
import tomllib
from dataclasses import dataclass
from pathlib import Path


class FirmwareArtifactError(ValueError):
    """Raised when a requested PlatformIO artifact set is incomplete or mixed."""


@dataclass(frozen=True)
class EnvironmentArtifacts:
    environment: str
    build_dir: Path
    firmware_bin: Path
    firmware_merged_bin: Path
    firmware_elf: Path


@dataclass(frozen=True)
class PreparedArtifacts:
    environment: str
    source: EnvironmentArtifacts
    staging_dir: Path
    firmware_bin: Path
    firmware_merged_bin: Path
    firmware_elf: Path
    manifest: Path


def _validate_environment_name(environment: str) -> str:
    normalized = environment.strip()
    if (
        not normalized
        or Path(normalized).name != normalized
        or "/" in normalized
        or "\\" in normalized
    ):
        raise FirmwareArtifactError(f"invalid PlatformIO environment: {environment!r}")
    return normalized


def resolve_environment_artifacts(
    repo_root: Path, environment: str
) -> EnvironmentArtifacts:
    root = repo_root.resolve()
    environment = _validate_environment_name(environment)
    build_root = (root / ".pio" / "build").resolve()
    build_dir = (build_root / environment).resolve()
    if build_dir.parent != build_root:
        raise FirmwareArtifactError(
            f"environment escapes PlatformIO build root: {environment}"
        )

    artifacts = EnvironmentArtifacts(
        environment=environment,
        build_dir=build_dir,
        firmware_bin=build_dir / "firmware.bin",
        firmware_merged_bin=build_dir / "firmware-merged.bin",
        firmware_elf=build_dir / "firmware.elf",
    )
    for label, path in (
        ("BIN", artifacts.firmware_bin),
        ("merged BIN", artifacts.firmware_merged_bin),
        ("ELF", artifacts.firmware_elf),
    ):
        if not path.is_file():
            raise FirmwareArtifactError(
                f"{label} not found for {environment}: {path}"
            )
        if path.resolve().parent != build_dir:
            raise FirmwareArtifactError(
                f"{label} does not belong to environment {environment}: {path}"
            )
    return artifacts


def _repo_relative(path: Path, repo_root: Path) -> str:
    try:
        return path.resolve().relative_to(repo_root.resolve()).as_posix()
    except ValueError as exc:
        raise FirmwareArtifactError(f"artifact is outside repository: {path}") from exc


def _expected_manifest(
    source: EnvironmentArtifacts, prepared: PreparedArtifacts, repo_root: Path
) -> dict[str, object]:
    return {
        "version": 1,
        "environment": source.environment,
        "source": {
            "firmware_bin": _repo_relative(source.firmware_bin, repo_root),
            "firmware_merged_bin": _repo_relative(
                source.firmware_merged_bin, repo_root
            ),
            "firmware_elf": _repo_relative(source.firmware_elf, repo_root),
        },
        "prepared": {
            "firmware_bin": _repo_relative(prepared.firmware_bin, repo_root),
            "firmware_merged_bin": _repo_relative(
                prepared.firmware_merged_bin, repo_root
            ),
            "firmware_elf": _repo_relative(prepared.firmware_elf, repo_root),
        },
    }


def _prepared_paths(repo_root: Path, source: EnvironmentArtifacts) -> PreparedArtifacts:
    staging_dir = repo_root.resolve() / ".pio" / "wokwi" / "current"
    return PreparedArtifacts(
        environment=source.environment,
        source=source,
        staging_dir=staging_dir,
        firmware_bin=staging_dir / "firmware.bin",
        firmware_merged_bin=staging_dir / "firmware-merged.bin",
        firmware_elf=staging_dir / "firmware.elf",
        manifest=staging_dir / "artifacts.json",
    )


def prepare_wokwi_artifacts(repo_root: Path, environment: str) -> PreparedArtifacts:
    root = repo_root.resolve()
    source = resolve_environment_artifacts(root, environment)
    prepared = _prepared_paths(root, source)
    prepared.staging_dir.mkdir(parents=True, exist_ok=True)

    for source_path, target_path in (
        (source.firmware_bin, prepared.firmware_bin),
        (source.firmware_merged_bin, prepared.firmware_merged_bin),
        (source.firmware_elf, prepared.firmware_elf),
    ):
        temporary_path = target_path.with_name(target_path.name + ".tmp")
        shutil.copyfile(source_path, temporary_path)
        os.replace(temporary_path, target_path)

    manifest_data = _expected_manifest(source, prepared, root)
    temporary_manifest = prepared.manifest.with_name(
        prepared.manifest.name + ".tmp"
    )
    temporary_manifest.write_text(
        json.dumps(manifest_data, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary_manifest, prepared.manifest)
    return validate_prepared_artifacts(root, environment)


def validate_prepared_artifacts(
    repo_root: Path, environment: str
) -> PreparedArtifacts:
    root = repo_root.resolve()
    source = resolve_environment_artifacts(root, environment)
    prepared = _prepared_paths(root, source)
    if not prepared.manifest.is_file():
        raise FirmwareArtifactError(
            f"Wokwi artifact manifest not found: {prepared.manifest}"
        )

    try:
        manifest_data = json.loads(prepared.manifest.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise FirmwareArtifactError(
            f"invalid Wokwi artifact manifest: {prepared.manifest}"
        ) from exc
    if not isinstance(manifest_data, dict):
        raise FirmwareArtifactError(
            f"invalid Wokwi artifact manifest: {prepared.manifest}"
        )

    expected_manifest = _expected_manifest(source, prepared, root)
    if manifest_data != expected_manifest:
        prepared_environment = manifest_data.get("environment", "unknown")
        raise FirmwareArtifactError(
            "prepared artifacts do not match requested environment "
            f"{environment}: prepared={prepared_environment}"
        )

    for label, source_path, prepared_path in (
        ("BIN", source.firmware_bin, prepared.firmware_bin),
        (
            "merged BIN",
            source.firmware_merged_bin,
            prepared.firmware_merged_bin,
        ),
        ("ELF", source.firmware_elf, prepared.firmware_elf),
    ):
        if not prepared_path.is_file():
            raise FirmwareArtifactError(
                f"prepared {label} not found for {environment}: {prepared_path}"
            )
        if not filecmp.cmp(source_path, prepared_path, shallow=False):
            raise FirmwareArtifactError(
                f"prepared {label} is stale or belongs to another environment: "
                f"{environment}"
            )
    return prepared


def validate_wokwi_configuration(
    simulation_dir: Path, prepared: PreparedArtifacts
) -> None:
    simulation_dir = simulation_dir.resolve()
    config_path = simulation_dir / "wokwi.toml"
    try:
        config = tomllib.loads(config_path.read_text(encoding="utf-8"))["wokwi"]
    except (KeyError, OSError, tomllib.TOMLDecodeError) as exc:
        raise FirmwareArtifactError(f"invalid Wokwi configuration: {config_path}") from exc
    if not isinstance(config, dict):
        raise FirmwareArtifactError(f"invalid Wokwi configuration: {config_path}")

    configured_firmware = (simulation_dir / str(config.get("firmware", ""))).resolve()
    configured_elf = (simulation_dir / str(config.get("elf", ""))).resolve()
    if configured_firmware != prepared.firmware_merged_bin.resolve():
        raise FirmwareArtifactError(
            "wokwi.toml firmware does not reference the prepared merged BIN"
        )
    if configured_elf != prepared.firmware_elf.resolve():
        raise FirmwareArtifactError(
            "wokwi.toml ELF does not reference the prepared ELF"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--simulation-dir", type=Path, required=True)
    parser.add_argument("--environment", required=True)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    try:
        if args.verify_only:
            prepared = validate_prepared_artifacts(
                args.repo_root, args.environment
            )
        else:
            prepared = prepare_wokwi_artifacts(args.repo_root, args.environment)
        validate_wokwi_configuration(args.simulation_dir, prepared)
    except FirmwareArtifactError as exc:
        parser.error(str(exc))

    print(f"WOKWI_ARTIFACTS: PASS environment={prepared.environment}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
