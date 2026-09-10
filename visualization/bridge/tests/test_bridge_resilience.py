import json
import unittest
from pathlib import Path
import sys
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sigas_bridge import Bridge
from test_parser import valid_state_payload


class BridgeResilienceTests(unittest.TestCase):
    def test_a02_07_bridge_continues_after_invalid_input(self):
        bridge = Bridge.__new__(Bridge)
        bridge.telemetry_socket = mock.Mock()
        bridge.godot_endpoint = ("127.0.0.1", 45701)

        bridge._publish_serial_line("@SIGAS null")
        bridge._publish_serial_line("[TIMING]")
        bridge._publish_serial_line("@SIGAS " + json.dumps(valid_state_payload()))

        bridge.telemetry_socket.sendto.assert_called_once()


if __name__ == "__main__":
    unittest.main()
