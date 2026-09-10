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
VALID_TIMING_RESULTS = {"PASS", "FAIL"}

TIMING_FIELD_PATTERN = re.compile(r"([A-Z0-9_]+)=([^\s]+)")
DECIMAL_PATTERN = re.compile(r"[0-9]+")


class TelemetryError(ValueError):
    """Raised when telemetry is malformed or unsafe."""


@dataclass(frozen=True)
class TelemetryFrame:
    payload: dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(self.payload, separators=(",", ":"), sort_keys=True)


def parse_line(line: str) -> TelemetryFrame | None:
    text = line.strip()
    if text == PREFIX.strip() or text.startswith(PREFIX):
        raw_payload = text[len(PREFIX) :]
        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError as exc:
            raise TelemetryError("invalid SIGAS JSON") from exc
        return TelemetryFrame(_validate_state_payload(payload))
    if text.startswith("[TIMING]"):
        return TelemetryFrame(_parse_timing_line(text))
    return None


def _validate_state_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise TelemetryError("SIGAS payload must be an object")

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
        "reset",
        "valve",
        "buzzer",
        "sample_us",
        "decision_us",
        "deadline_us",
    }
    missing = sorted(required.difference(payload))
    if missing:
        raise TelemetryError(f"missing fields: {', '.join(missing)}")
    validated = payload.copy()
    if not isinstance(validated["type"], str) or validated["type"] != "state":
        raise TelemetryError("unsupported telemetry type")
    if not isinstance(validated["state"], str) or validated["state"] not in VALID_STATES:
        raise TelemetryError("invalid system state")
    if not isinstance(validated["action"], str) or validated["action"] not in VALID_ACTIONS:
        raise TelemetryError("invalid action")
    if not isinstance(validated["reason"], str) or not validated["reason"]:
        raise TelemetryError("reason must be a non-empty string")
    if (
        not isinstance(validated["zone1_level"], str)
        or not isinstance(validated["zone2_level"], str)
        or validated["zone1_level"] not in VALID_LEVELS
        or validated["zone2_level"] not in VALID_LEVELS
    ):
        raise TelemetryError("invalid zone level")
    if not isinstance(validated["valve"], str) or validated["valve"] not in VALID_VALVES:
        raise TelemetryError("invalid valve state")
    if not isinstance(validated["reset"], bool):
        raise TelemetryError("reset must be a boolean")
    if not isinstance(validated["buzzer"], bool):
        raise TelemetryError("buzzer must be a boolean")
    for key in ("seq", "zone1_adc", "zone2_adc", "sample_us", "decision_us"):
        validated[key] = _json_int(validated[key], key, minimum=0)
    validated["deadline_us"] = _json_int(validated["deadline_us"], "deadline_us", minimum=1)
    for key in ("zone1_adc", "zone2_adc"):
        if validated[key] > 4095:
            raise TelemetryError(f"{key} out of ADC range")
    return {key: validated[key] for key in required}


def _parse_timing_line(text: str) -> dict[str, Any]:
    body = text[len("[TIMING]") :].strip()
    if not body:
        raise TelemetryError("empty timing event")

    fields: dict[str, str] = {}
    for token in body.split():
        match = TIMING_FIELD_PATTERN.fullmatch(token)
        if match is None:
            raise TelemetryError("malformed timing field")
        key, value = match.groups()
        if key in fields:
            raise TelemetryError(f"duplicate timing field: {key}")
        fields[key] = value

    required = {"SEQ", "T_CRITICAL_CONFIRMED", "T_ACTUATOR_RECEIVED", "DEADLINE_US"}
    missing = sorted(required.difference(fields))
    if missing:
        raise TelemetryError(f"missing timing fields: {', '.join(missing)}")

    seq = _decimal_int(fields["SEQ"], "SEQ", minimum=0)
    confirmed_us = _decimal_int(
        fields["T_CRITICAL_CONFIRMED"], "T_CRITICAL_CONFIRMED", minimum=0
    )
    received_us = _decimal_int(
        fields["T_ACTUATOR_RECEIVED"], "T_ACTUATOR_RECEIVED", minimum=0
    )
    deadline_us = _decimal_int(fields["DEADLINE_US"], "DEADLINE_US", minimum=1)
    if received_us < confirmed_us:
        raise TelemetryError("T_ACTUATOR_RECEIVED precedes T_CRITICAL_CONFIRMED")

    response_us = received_us - confirmed_us
    for derived_name in ("POST_CONFIRMATION_RECEIVED_US", "POST_CONFIRMATION_US"):
        if derived_name in fields:
            logged_response = _decimal_int(fields[derived_name], derived_name, minimum=0)
            if logged_response != response_us:
                raise TelemetryError(f"{derived_name} does not match timing timestamps")

    result = "PASS" if response_us <= deadline_us else "FAIL"
    logged_result = fields.get("RESULT")
    if logged_result is not None:
        if logged_result not in VALID_TIMING_RESULTS:
            raise TelemetryError("invalid timing result")
        if logged_result != result:
            raise TelemetryError("timing result does not match measured response")

    return {
        "type": "timing",
        "seq": seq,
        "t_critical_confirmed_us": confirmed_us,
        "t_actuator_received_us": received_us,
        "response_us": response_us,
        "deadline_us": deadline_us,
        "result": result,
    }


def _json_int(value: Any, name: str, minimum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TelemetryError(f"{name} must be a JSON integer")
    if value < minimum:
        raise TelemetryError(f"{name} below minimum")
    return value


def _decimal_int(value: str, name: str, minimum: int) -> int:
    if DECIMAL_PATTERN.fullmatch(value) is None:
        raise TelemetryError(f"{name} must be a decimal integer")
    parsed = int(value)
    if parsed < minimum:
        raise TelemetryError(f"{name} below minimum")
    return parsed
