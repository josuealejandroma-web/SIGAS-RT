import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scenario_runner import ScenarioCatalog, ScenarioError


class ScenarioProtocolTests(unittest.TestCase):
    def test_resolves_allowed_scenario(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sim = root / "simulation"
            sim.mkdir()
            (sim / "timing_test.yaml").write_text("name: test\n", encoding="utf-8")
            catalog_path = root / "catalog.json"
            catalog_path.write_text(
                json.dumps(
                    {
                        "commands": {
                            "RUN_ZONE1_LEAK": {
                                "label": "Zona 1",
                                "scenario": "timing_test.yaml",
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            catalog = ScenarioCatalog(catalog_path, sim)
            scenario = catalog.resolve("run_zone1_leak")
            self.assertEqual(scenario.scenario.name, "timing_test.yaml")

    def test_rejects_unknown_command(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sim = root / "simulation"
            sim.mkdir()
            catalog_path = root / "catalog.json"
            catalog_path.write_text(json.dumps({"commands": {}}), encoding="utf-8")
            catalog = ScenarioCatalog(catalog_path, sim)
            with self.assertRaises(ScenarioError):
                catalog.resolve("OPEN_VALVE")

    def test_rejects_direct_actuator_command_even_if_listed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sim = root / "simulation"
            sim.mkdir()
            (sim / "demo.yaml").write_text("name: test\n", encoding="utf-8")
            catalog_path = root / "catalog.json"
            catalog_path.write_text(
                json.dumps(
                    {
                        "commands": {
                            "RUN_VALVE_CLOSE": {
                                "label": "Unsafe",
                                "scenario": "demo.yaml",
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            catalog = ScenarioCatalog(catalog_path, sim)
            with self.assertRaises(ScenarioError):
                catalog.resolve("RUN_VALVE_CLOSE")


if __name__ == "__main__":
    unittest.main()
