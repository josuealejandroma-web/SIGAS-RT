"""Own the bridge process tree with a Windows Job; wait for interactive Blender."""

import argparse
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[3]


class ProcessJob:
    """Closing the job terminates only the processes assigned to this launcher."""

    def __init__(self):
        if os.name != "nt":
            raise RuntimeError("This launcher requires Windows")
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.kernel = kernel
        kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        kernel.CreateJobObjectW.restype = wintypes.HANDLE
        kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
        kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]

        class BasicLimits(ctypes.Structure):
            _fields_ = [("ProcessTime", ctypes.c_int64), ("JobTime", ctypes.c_int64),
                        ("LimitFlags", wintypes.DWORD), ("MinWorkingSet", ctypes.c_size_t),
                        ("MaxWorkingSet", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                        ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD),
                        ("SchedulingClass", wintypes.DWORD)]

        class IOCounters(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in (
                "ReadOps", "WriteOps", "OtherOps", "ReadBytes", "WriteBytes", "OtherBytes")]

        class ExtendedLimits(ctypes.Structure):
            _fields_ = [("Basic", BasicLimits), ("IO", IOCounters),
                        ("ProcessMemory", ctypes.c_size_t), ("JobMemory", ctypes.c_size_t),
                        ("PeakProcessMemory", ctypes.c_size_t), ("PeakJobMemory", ctypes.c_size_t)]

        self.handle = kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = ExtendedLimits()
        limits.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            self.close()
            raise ctypes.WinError(ctypes.get_last_error())

    def assign(self, process):
        if not self.kernel.AssignProcessToJobObject(self.handle, wintypes.HANDLE(int(process._handle))):
            raise ctypes.WinError(ctypes.get_last_error())

    def close(self):
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None


def bridge_entry(timeout_ms):
    # Gate avoids starting builds/Wokwi before the parent assigns our Job.
    if sys.stdin.buffer.read(1) != b"1":
        return 2
    sys.path.insert(0, str(REPO / "visualization/bridge"))
    from sigas_bridge import main
    return main(["--timeout-ms", str(timeout_ms)])


def require_e2e_success(path, started_ns):
    if not path.is_file() or path.stat().st_mtime_ns < started_ns:
        raise RuntimeError("E2E no genero un informe actual")
    if json.loads(path.read_text(encoding="utf-8")).get("passed") is not True:
        raise RuntimeError("E2E fallo; revisar su informe local")


def launch(blender, timeout_ms=45000, e2e=False, auto_demo=False):
    logs = REPO / ".pio/blender-live"
    logs.mkdir(parents=True, exist_ok=True)
    temporary = logs / "temp"
    temporary.mkdir(exist_ok=True)
    ui_env = {**os.environ, "TEMP": str(temporary), "TMP": str(temporary)}
    stamp = time.time_ns()
    job = ProcessJob()
    bridge = None
    ui = None
    try:
        with (logs / f"bridge-{stamp}.log").open("w", encoding="utf-8") as log:
            bridge = subprocess.Popen(
                [sys.executable, "-u", str(Path(__file__).resolve()), "--bridge-entry", "--timeout-ms", str(timeout_ms)],
                cwd=REPO, stdin=subprocess.PIPE, stdout=log, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW)
            job.assign(bridge)
            bridge.stdin.write(b"1")
            bridge.stdin.flush()
            bridge.stdin.close()
            ready = False
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline and bridge.poll() is None:
                content = (logs / f"bridge-{stamp}.log").read_text(encoding="utf-8", errors="replace")
                if "[BRIDGE] listening on 127.0.0.1:45702" in content:
                    ready = True
                    break
                time.sleep(0.1)
            if not ready:
                raise RuntimeError("Bridge no pudo iniciar. Revisar el log local; el puerto puede estar ocupado.")
            script = "live_e2e.py" if e2e else "start_live.py"
            args = [str(blender), "--factory-startup", str(REPO / "visualization/blender/source/sigas_house.blend"),
                    "--python-exit-code", "1", "--python", str(REPO / "visualization/blender/live" / script)]
            if auto_demo:
                args.extend(["--", "--auto-demo"])
            startup = subprocess.STARTUPINFO()
            startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startup.wShowWindow = 1  # SW_SHOWNORMAL, even when our parent shell is hidden.
            with (logs / f"blender-{stamp}.log").open("w", encoding="utf-8") as ui_log:
                ui = subprocess.Popen(args, cwd=REPO, stdout=ui_log, stderr=subprocess.STDOUT,
                                      startupinfo=startup, env=ui_env)
                job.assign(ui)
                print("SIGAS_BLENDER_LAUNCHER: bridge listo; Blender interactivo", flush=True)
                code = ui.wait(timeout=660 if e2e else None)
                if code:
                    raise RuntimeError(f"Blender termino con codigo {code}; revisar .pio/blender-live")
                if auto_demo:
                    require_e2e_success(logs / "live_e2e_report.json", stamp)
                return 0
    finally:
        job.close()
        for process in (ui, bridge):
            if process is not None:
                if process.poll() is None:
                    process.terminate()
                process.wait(timeout=5)
        print("SIGAS_BLENDER_LAUNCHER: procesos propios cerrados", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender", type=Path)
    parser.add_argument("--timeout-ms", type=int, default=45000)
    parser.add_argument("--bridge-entry", action="store_true")
    parser.add_argument("--e2e", action="store_true")
    parser.add_argument("--auto-demo", action="store_true")
    args = parser.parse_args()
    if args.bridge_entry:
        return bridge_entry(args.timeout_ms)
    if args.blender is None or not args.blender.is_file():
        parser.error("--blender requires an existing executable")
    if args.auto_demo and not args.e2e:
        parser.error("--auto-demo requires --e2e")
    return launch(args.blender, args.timeout_ms, args.e2e, args.auto_demo)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
