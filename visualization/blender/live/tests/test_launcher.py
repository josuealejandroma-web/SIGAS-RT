import ctypes
from ctypes import wintypes
import os
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from visualization.blender.live.launcher import ProcessJob, require_e2e_success


class ReportTests(unittest.TestCase):
    def test_e2e_rejects_missing_stale_or_failed_reports(self):
        root = Path(__file__).resolve().parents[4] / '.pio/blender-live'
        root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as directory:
            path = Path(directory) / 'report.json'
            with self.assertRaises(RuntimeError):
                require_e2e_success(path, 0)
            path.write_text(json.dumps({'passed': False}), encoding='utf-8')
            with self.assertRaises(RuntimeError):
                require_e2e_success(path, 0)
            path.write_text(json.dumps({'passed': True}), encoding='utf-8')
            with self.assertRaises(RuntimeError):
                require_e2e_success(path, path.stat().st_mtime_ns + 1)
            require_e2e_success(path, 0)


@unittest.skipUnless(os.name == 'nt', 'Windows Job test')
class JobTests(unittest.TestCase):
    def test_close_kills_owned_child_tree_only(self):
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        sleeper = 'import time; time.sleep(60)'
        unrelated = subprocess.Popen([sys.executable, '-c', sleeper], creationflags=subprocess.CREATE_NO_WINDOW)
        parent = None
        child_handle = None
        job = ProcessJob()
        try:
            script = ('import sys, subprocess, time; sys.stdin.read(1); '
                      f'child=subprocess.Popen([sys.executable, "-c", {sleeper!r}]); '
                      'print(child.pid, flush=True); time.sleep(60)')
            parent = subprocess.Popen([sys.executable, '-u', '-c', script], stdin=subprocess.PIPE,
                                      stdout=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW)
            job.assign(parent)
            parent.stdin.write(b'1')
            parent.stdin.flush()
            child_pid = int(parent.stdout.readline())
            child_handle = kernel.OpenProcess(0x100000, False, child_pid)
            self.assertTrue(child_handle)
            job.close()
            job.close()
            parent.wait(timeout=5)
            self.assertEqual(kernel.WaitForSingleObject(child_handle, 5000), 0)
            self.assertIsNone(unrelated.poll())
        finally:
            job.close()
            for proc in (parent, unrelated):
                if proc is not None:
                    if proc.poll() is None:
                        proc.terminate()
                    proc.wait(timeout=5)
                    for stream in (proc.stdin, proc.stdout):
                        if stream:
                            stream.close()
            if child_handle:
                kernel.CloseHandle(child_handle)


if __name__ == '__main__':
    unittest.main()
