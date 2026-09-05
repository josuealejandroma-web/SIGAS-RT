import json
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from telemetry_parser import TelemetryError, parse_line


class TelemetryParserTests(unittest.TestCase):
    def test_parses_structured_state_line(self):
        payload = {
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
            "deadline_us": 500000,
        }
        frame = parse_line("@SIGAS " + json.dumps(payload))
        self.assertIsNotNone(frame)
        self.assertEqual(frame.payload["state"], "SYSTEM_NORMAL")
        self.assertEqual(frame.payload["result"], "PASS")

    def test_rejects_adc_out_of_range(self):
        payload = {
            "type": "state",
            "seq": 1,
            "state": "SYSTEM_NORMAL",
            "action": "NORMAL",
            "reason": "STABLE_NORMAL",
            "zone1_adc": 4096,
            "zone2_adc": 410,
            "zone1_level": "NORMAL",
            "zone2_level": "NORMAL",
            "reset": False,
            "valve": "OPEN",
            "buzzer": False,
            "deadline_us": 500000,
        }
        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS " + json.dumps(payload))

    def test_rejects_unknown_state(self):
        payload = {
            "type": "state",
            "seq": 1,
            "state": "OPEN_VALVE_NOW",
            "action": "NORMAL",
            "reason": "STABLE_NORMAL",
            "zone1_adc": 400,
            "zone2_adc": 410,
            "zone1_level": "NORMAL",
            "zone2_level": "NORMAL",
            "reset": False,
            "valve": "OPEN",
            "buzzer": False,
            "deadline_us": 500000,
        }
        with self.assertRaises(TelemetryError):
            parse_line("@SIGAS " + json.dumps(payload))

    def test_parses_timing_line(self):
        line = (
            "[TIMING] SEQ=3 POST_CONFIRMATION_RECEIVED_US=22502 "
            "DEADLINE_US=500000 RESULT=PASS"
        )
        frame = parse_line(line)
        self.assertIsNotNone(frame)
        self.assertEqual(frame.payload["type"], "timing")
        self.assertEqual(frame.payload["response_us"], 22502)
        self.assertEqual(frame.payload["valve"], "CLOSED")

    def test_ignores_non_telemetry(self):
        self.assertIsNone(parse_line("[SENSORS] SEQ=1 Z1=410 Z2=410"))


if __name__ == "__main__":
    unittest.main()
