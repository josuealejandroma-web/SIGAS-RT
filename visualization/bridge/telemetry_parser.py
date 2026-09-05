"""Parser de telemetria SIGAS-RT para el bridge local."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

PREFIX = "@SIGAS "

VALID_STATES = {
    "SYSTEM_STARTUP",
    "SYSTEM_NORMAL",
    "SYSTEM_WARNING",
    "SYSTEM_CRITICAL",
    "SYSTEM_SAFE_LATCHED",
    "SYSTEM_FAULT",
}
VALID_ACTIONS = {"NORMAL", "WARNING", "SAFE_CLOSE", "ALARM_ONLY"}
VALID_LEVELS = {"NORMAL", "WARNING", "HIGH"}
VALID_VALVES = {"OPEN", "CLOSED"}
VALID_RESULTS = {"PASS", "FAIL", "BOOT", "CANDIDATE", "-"}

TIMING_PATTERN = re.compile(r"([A-Z0-9_]+)=([A-Za-z0-9_]+)")


class TelemetryError(ValueError):
    """Raised when telemetry is malformed or unsafe."""


@dataclass(frozen=True)
class TelemetryFrame:
    payload: dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(self.payload, separators=(",", ":"), sort_keys=True)


def parse_line(line: str) -> TelemetryFrame | None:
    text = line.strip()
    if text.startswith(PREFIX):
        return TelemetryFrame(_validate_state_payload(json.loads(text[len(PREFIX) :])))
    if text.startswith("[TIMING]"):
        return TelemetryFrame(_parse_timing_line(text))
    return None


def _validate_state_payload(payload: dict[str, Any]) -> dict[str, Any]:
    required = {
        "type",
        "seq",
        "state",
        "action",
        "reason",
        "zone1_adc",
        "zone2_adc",
        "zone1_level",
        "zone2_level",
        "valve",
        "buzzer",
        "deadline_us",
    }
    missing = sorted(required.difference(payload))
    if missing:
        raise TelemetryError(f"missing fields: {', '.join(missing)}")
    if payload["type"] != "state":
        raise TelemetryError("unsupported telemetry type")
    if payload["state"] not in VALID_STATES:
        raise TelemetryError("invalid system state")
    if payload["action"] not in VALID_ACTIONS:
        raise TelemetryError("invalid action")
    if payload["zone1_level"] not in VALID_LEVELS or payload["zone2_level"] not in VALID_LEVELS:
        raise TelemetryError("invalid zone level")
    if payload["valve"] not in VALID_VALVES:
        raise TelemetryError("invalid valve state")
    for key in ("seq", "zone1_adc", "zone2_adc", "deadline_us"):
        payload[key] = _bounded_int(payload[key], key, minimum=0)
    for key in ("zone1_adc", "zone2_adc"):
        if payload[key] > 4095:
            raise TelemetryError(f"{key} out of ADC range")
    payload["buzzer"] = bool(payload["buzzer"])
    payload.setdefault("response_us", 0)
    payload.setdefault("result", "PASS" if payload["response_us"] <= payload["deadline_us"] else "FAIL")
    return payload


def _parse_timing_line(text: str) -> dict[str, Any]:
    fields = dict(TIMING_PATTERN.findall(text))
    response_us = _bounded_int(
        fields.get("POST_CONFIRMATION_RECEIVED_US", fields.get("POST_CONFIRMATION_US", 0)),
        "response_us",
        minimum=0,
    )
    deadline_us = _bounded_int(fields.get("DEADLINE_US", 500000), "deadline_us", minimum=1)
    result = fields.get("RESULT", "PASS" if response_us <= deadline_us else "FAIL")
    if result not in VALID_RESULTS:
        raise TelemetryError("invalid timing result")
    return {
        "type": "timing",
        "seq": _bounded_int(fields.get("SEQ", 0), "seq", minimum=0),
        "state": "SYSTEM_SAFE_LATCHED",
        "action": "SAFE_CLOSE",
        "zone1_adc": 0,
        "zone2_adc": 0,
        "zone1_level": "HIGH",
        "zone2_level": "NORMAL",
        "valve": "CLOSED",
        "buzzer": True,
        "response_us": response_us,
        "deadline_us": deadline_us,
        "result": result,
    }


def _bounded_int(value: Any, name: str, minimum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise TelemetryError(f"{name} must be an integer") from exc
    if parsed < minimum:
        raise TelemetryError(f"{name} below minimum")
    return parsed
