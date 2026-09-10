from pathlib import Path
import subprocess
import sys

Import("env")


def merge_firmware(source, target, env):
    build_dir = Path(env.subst("$BUILD_DIR")).resolve()
    platformio_dir = Path.home() / ".platformio"
    boot_app0 = (
        platformio_dir
        / "packages"
        / "framework-arduinoespressif32"
        / "tools"
        / "partitions"
        / "boot_app0.bin"
    )
    esptool = platformio_dir / "packages" / "tool-esptoolpy" / "esptool.py"
    output = build_dir / "firmware-merged.bin"

    required_inputs = [
        build_dir / "bootloader.bin",
        build_dir / "partitions.bin",
        build_dir / "firmware.bin",
        build_dir / "firmware.elf",
        boot_app0,
        esptool,
    ]
    missing = [path for path in required_inputs if not path.is_file()]
    if missing:
        missing_text = ", ".join(str(path) for path in missing)
        raise RuntimeError(f"Missing build artifacts: {missing_text}")

    command = [
        sys.executable,
        str(esptool),
        "--chip",
        "esp32",
        "merge_bin",
        "-o",
        str(output),
        "--flash_mode",
        "dio",
        "--flash_freq",
        "40m",
        "--flash_size",
        "4MB",
        "0x1000",
        str(build_dir / "bootloader.bin"),
        "0x8000",
        str(build_dir / "partitions.bin"),
        "0xe000",
        str(boot_app0),
        "0x10000",
        str(build_dir / "firmware.bin"),
    ]

    subprocess.run(command, check=True)
    if not output.is_file():
        raise RuntimeError(f"Merged firmware was not generated: {output}")


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", merge_firmware)
