"""Generate observed execution-time statistics from recorded task samples."""

from __future__ import annotations

import argparse
import csv
import io
import os
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


OUTPUT_FIELDS = ("task", "count", "min_us", "average_us", "max_us")


class SummaryError(ValueError):
    """Raised when observed execution-time input is invalid or incomplete."""


def load_observations(input_path: Path) -> dict[str, list[int]]:
    observations: dict[str, list[int]] = defaultdict(list)
    try:
        with input_path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            required_fields = {"task", "duration_us"}
            if not reader.fieldnames or not required_fields.issubset(reader.fieldnames):
                raise SummaryError(
                    f"missing required columns in observed data: {input_path}"
                )
            for line_number, row in enumerate(reader, start=2):
                task = (row.get("task") or "").strip()
                if not task:
                    raise SummaryError(f"empty task at line {line_number}")
                try:
                    duration_us = int(row["duration_us"])
                except (TypeError, ValueError) as exc:
                    raise SummaryError(
                        f"invalid duration_us at line {line_number}"
                    ) from exc
                if duration_us < 0:
                    raise SummaryError(
                        f"negative duration_us at line {line_number}"
                    )
                observations[task].append(duration_us)
    except OSError as exc:
        raise SummaryError(f"cannot read observed data: {input_path}") from exc

    if not observations:
        raise SummaryError(f"no observed execution-time samples: {input_path}")
    return dict(observations)


def summarize_observations(
    observations: dict[str, list[int]],
) -> list[dict[str, str]]:
    rows = []
    for task in sorted(observations):
        values = observations[task]
        average = (Decimal(sum(values)) / Decimal(len(values))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        rows.append(
            {
                "task": task,
                "count": str(len(values)),
                "min_us": str(min(values)),
                "average_us": f"{average:.2f}",
                "max_us": str(max(values)),
            }
        )
    return rows


def render_summary(rows: list[dict[str, str]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(
        output,
        fieldnames=OUTPUT_FIELDS,
        quoting=csv.QUOTE_ALL,
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def expected_summary(input_path: Path) -> str:
    return render_summary(summarize_observations(load_observations(input_path)))


def write_summary(input_path: Path, output_path: Path) -> None:
    content = expected_summary(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_name(output_path.name + ".tmp")
    with temporary_path.open("w", encoding="utf-8", newline="") as stream:
        stream.write(content)
    os.replace(temporary_path, output_path)


def check_summary(input_path: Path, output_path: Path) -> None:
    expected = expected_summary(input_path)
    try:
        actual = output_path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    except OSError as exc:
        raise SummaryError(f"cannot read summary: {output_path}") from exc
    if actual != expected:
        raise SummaryError(
            f"summary is stale; regenerate {output_path} from {input_path}"
        )


def main() -> int:
    results_dir = Path(__file__).resolve().parent / "results"
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=Path,
        default=results_dir / "wcet_observed.csv",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=results_dir / "wcet_summary.csv",
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    try:
        if args.check:
            check_summary(args.input, args.output)
            action = "verified"
        else:
            write_summary(args.input, args.output)
            action = "generated"
    except SummaryError as exc:
        parser.error(str(exc))

    print(f"OBSERVED_EXECUTION_TIME_SUMMARY: PASS ({action})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
