"""Bounded localhost transport. This module never imports or calls bpy."""

import queue
import socket
import threading
import time

HOST = "127.0.0.1"
TELEMETRY_PORT = 45701
COMMAND_PORT = 45702


class TelemetryReceiver:
    def __init__(self, port=TELEMETRY_PORT, capacity=128, clock=time.monotonic):
        self.port = port
        self.clock = clock
        self.queue = queue.Queue(maxsize=capacity)
        self.socket = None
        self.worker = None
        self.stopping = threading.Event()
        self.lock = threading.Lock()
        self.error = ""
        self.dropped = 0

    @property
    def running(self):
        return self.worker is not None and self.worker.is_alive()

    def start(self):
        with self.lock:
            if self.running:
                return False
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
                sock.bind((HOST, self.port))
                sock.settimeout(0.1)
            except BaseException:
                sock.close()
                raise
            self.port = sock.getsockname()[1]
            self.socket = sock
            self.stopping.clear()
            self.error = ""
            self.drain()
            self.worker = threading.Thread(target=self._receive, args=(sock,),
                                           name="SIGAS-Blender-UDP", daemon=True)
            self.worker.start()
            return True

    def _receive(self, sock):
        while not self.stopping.is_set():
            try:
                data, peer = sock.recvfrom(8192)
                if peer[0] != HOST:
                    continue
            except socket.timeout:
                continue
            except OSError as exc:
                if not self.stopping.is_set():
                    self.error = type(exc).__name__
                break
            item = (data, self.clock())
            try:
                self.queue.put_nowait(item)
            except queue.Full:
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
                self.dropped += 1
                self.queue.put_nowait(item)

    def drain(self):
        items = []
        for _ in range(self.queue.maxsize):
            try:
                items.append(self.queue.get_nowait())
            except queue.Empty:
                break
        return items

    def stop(self):
        with self.lock:
            self.stopping.set()
            if self.socket is not None:
                self.socket.close()
                self.socket = None
            if self.worker is not None:
                self.worker.join(timeout=1)
                if self.worker.is_alive():
                    raise RuntimeError("UDP worker did not stop")
                self.worker = None
            self.drain()


def send_command(command, allowed, port=COMMAND_PORT):
    if command not in allowed:
        raise ValueError("Scenario is not in the catalog")
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
        peer.sendto(command.encode("ascii"), (HOST, port))

