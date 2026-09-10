import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from generate_wcet_summary import (
    SummaryError,
    check_summary,
    expected_summary,
    write_summary,
)


class ObservedExecutionTimeSummaryTests(unittest.TestCase):
    def test_generates_sorted_count_min_average_and_max(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            observed = root / "observed.csv"
            observed.write_text(
                '"task","duration_us"\n'
                '"TaskSafety","9"\n'
                '"TaskActuator","4"\n'
                '"TaskSafety","10"\n',
                encoding="utf-8",
            )

            self.assertEqual(
                expected_summary(observed),
                '"task","count","min_us","average_us","max_us"\n'
                '"TaskActuator","1","4","4.00","4"\n'
                '"TaskSafety","2","9","9.50","10"\n',
            )

    def test_detects_stale_summary_and_accepts_regenerated_summary(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            observed = root / "observed.csv"
            summary = root / "summary.csv"
            observed.write_text(
                '"task","duration_us"\n"TaskSensors","7"\n',
                encoding="utf-8",
            )
            summary.write_text("stale\n", encoding="utf-8")

            with self.assertRaisesRegex(SummaryError, "stale"):
                check_summary(observed, summary)
            write_summary(observed, summary)
            check_summary(observed, summary)


if __name__ == "__main__":
    unittest.main()
