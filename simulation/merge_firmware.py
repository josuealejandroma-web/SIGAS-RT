from pathlib import Path
import subprocess
import sys

Import("env")


def merge_firmware(source, target, env):
    project_dir = Path(env.subst("$PROJECT_DIR"))
    build_dir = Path(env.subst("$BUILD_DIR"))
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
    output = project_dir / "simulation" / "firmware-merged.bin"

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


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", merge_firmware)
