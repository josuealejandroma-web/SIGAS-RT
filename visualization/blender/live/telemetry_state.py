"""Local session semantics using the existing bridge telemetry contract."""

import json
import time

from visualization.bridge.telemetry_parser import TelemetryError, parse_line


def validate_payload(payload):
    if not isinstance(payload, dict):
        raise TelemetryError("packet must be an object")
    if payload.get("type") == "state":
        return parse_line("@SIGAS " + json.dumps(payload)).payload
    if payload.get("type") != "timing":
        raise TelemetryError("unsupported packet")
    fields = {
        "seq": "SEQ", "t_critical_confirmed_us": "T_CRITICAL_CONFIRMED",
        "t_actuator_received_us": "T_ACTUATOR_RECEIVED", "deadline_us": "DEADLINE_US",
        "response_us": "POST_CONFIRMATION_RECEIVED_US",
    }
    for key in fields:
        if type(payload.get(key)) is not int or payload[key] < 0:
            raise TelemetryError("invalid timing integer: " + key)
    if payload.get("result") not in ("PASS", "FAIL"):
        raise TelemetryError("missing timing result")
    line = "[TIMING] " + " ".join(f"{field}={payload[key]}" for key, field in fields.items())
    return parse_line(line + " RESULT=" + payload["result"]).payload


def decode_packet(data):
    return validate_payload(json.loads(data.decode("utf-8")))


class TelemetryState:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.state = None
        self.timing = None
        self.last_valid = None
        self.last_state = None
        self.last_timing = None
        self.accepted = 0
        self.rejected = 0

    def accept(self, data, received_at=None):
        try:
            payload = decode_packet(data)
        except (ValueError, TypeError, UnicodeError, OverflowError, RecursionError):
            self.rejected += 1
            return None
        now = self.clock() if received_at is None else received_at
        self.last_valid = now
        self.accepted += 1
        if payload["type"] == "state":
            if self.state and payload["sample_us"] < self.state["sample_us"]:
                self.timing = None
                self.last_timing = None
            self.state = payload
            self.last_state = now
        else:
            self.timing = payload
            self.last_timing = now
        return payload

    def connection(self, now=None):
        if self.last_valid is None:
            return "DISCONNECTED"
        age = max(0, (self.clock() if now is None else now) - self.last_valid)
        return "DISCONNECTED" if age >= 3 else "STALE" if age >= 1.5 else "LIVE"

