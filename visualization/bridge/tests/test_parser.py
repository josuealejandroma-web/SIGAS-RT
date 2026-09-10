import json
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from telemetry_parser import TelemetryError, parse_line


def valid_state_payload() -> dict:
    return {
        "type": "state",
        "seq": 7,
        "state": "SYSTEM_NORMAL",
        "action": "NORMAL",
        "reason": "STABLE_NORMAL",
        "zone1_adc": 410,
        "zone2_adc": 420,
        "zone1_level": "NORMAL",
        "zone2_level": "NORMAL",
        "reset": False,
        "valve": "OPEN",
        "buzzer": False,
        "sample_us": 1_500_000,
        "decision_us": 1_500_063,
        "deadline_us": 500_000,
    }


class TelemetryParserTests(unittest.TestCase):
    def test_parses_structured_state_line_without_fabricating_timing(self):
        frame = parse_line("@SIGAS " + json.dumps(valid_state_payload()))

        self.assertIsNotNone(frame)
        self.assertEqual(frame.payload["state"], "SYSTEM_NORMAL")
        self.assertNotIn("response_us", frame.payload)
        self.assertNotIn("result", frame.payload)

    def test_rejects_adc_out_of_range(self):
        payload = valid_state_payload()
        payload["zone1_adc"] = 4096

        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS " + json.dumps(payload))

    def test_rejects_unknown_state(self):
        payload = valid_state_payload()
        payload["state"] = "OPEN_VALVE_NOW"

        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS " + json.dumps(payload))

    def test_a02_01_valid_timing_passes_at_deadline(self):
        line = (
            "[TIMING] SEQ=3 T_CRITICAL_CONFIRMED=1000000 "
            "T_ACTUATOR_RECEIVED=1500000 POST_CONFIRMATION_RECEIVED_US=500000 "
            "DEADLINE_US=500000 RESULT=PASS"
        )

        frame = parse_line(line)

        self.assertIsNotNone(frame)
        self.assertEqual(frame.payload["type"], "timing")
        self.assertEqual(frame.payload["response_us"], 500000)
        self.assertEqual(frame.payload["result"], "PASS")
        self.assertNotIn("state", frame.payload)
        self.assertNotIn("valve", frame.payload)

    def test_a02_02_valid_timing_fails_over_deadline(self):
        frame = parse_line(
            "[TIMING] SEQ=4 T_CRITICAL_CONFIRMED=1000000 "
            "T_ACTUATOR_RECEIVED=1500001 DEADLINE_US=500000 RESULT=FAIL"
        )

        self.assertEqual(frame.payload["response_us"], 500001)
        self.assertEqual(frame.payload["result"], "FAIL")

    def test_a02_03_empty_timing_is_invalid(self):
        with self.assertRaises(TelemetryError):
            parse_line("[TIMING]")

    def test_rejects_timing_garbage(self):
        with self.assertRaises(TelemetryError):
            parse_line("[TIMING] basura")

    def test_rejects_timing_without_required_timestamps(self):
        with self.assertRaises(TelemetryError):
            parse_line("[TIMING] SEQ=3 DEADLINE_US=500000 RESULT=PASS")

    def test_rejects_timing_result_inconsistent_with_timestamps(self):
        with self.assertRaises(TelemetryError):
            parse_line(
                "[TIMING] SEQ=3 T_CRITICAL_CONFIRMED=1000000 "
                "T_ACTUATOR_RECEIVED=1600000 DEADLINE_US=500000 RESULT=PASS"
            )

    def test_a02_04_rejects_json_null(self):
        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS null")

    def test_a02_05_rejects_empty_object(self):
        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS {}")

    def test_rejects_non_object_json(self):
        for value in ([], "texto"):
            with self.subTest(value=value), self.assertRaises(TelemetryError):
                parse_line("@SIGAS " + json.dumps(value))

    def test_rejects_truncated_json(self):
        with self.assertRaises(TelemetryError):
            parse_line('@SIGAS {"type":"state"')

    def test_a02_06_rejects_incorrect_essential_types(self):
        invalid_values = {
            "seq": "7",
            "zone1_adc": 410.0,
            "buzzer": "false",
            "reset": 0,
            "state": 1,
        }
        for key, value in invalid_values.items():
            payload = valid_state_payload()
            payload[key] = value
            with self.subTest(key=key), self.assertRaises(TelemetryError):
                parse_line("@SIGAS " + json.dumps(payload))

    def test_rejects_missing_essential_field(self):
        payload = valid_state_payload()
        del payload["decision_us"]

        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS " + json.dumps(payload))

    def test_ignores_non_telemetry(self):
        self.assertIsNone(parse_line("[SENSORS] SEQ=1 Z1=410 Z2=410"))


if __name__ == "__main__":
    unittest.main()
