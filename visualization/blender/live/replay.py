"""Read the existing recorded replay without networking or scene access."""

import json
import re

from .telemetry_state import validate_payload


def load_replay(path):
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not records or not isinstance(records[0], dict):
        raise ValueError("Replay metadata missing")
    meta = records[0]
    if (meta.get("kind") != "metadata" or meta.get("format") != "sigas-recorded-replay-v1"
            or not meta.get("source") or not re.fullmatch("[a-fA-F0-9]{64}", meta.get("source_sha256", ""))):
        raise ValueError("Invalid replay metadata")
    frames = []
    previous = -1
    for record in records[1:]:
        if not isinstance(record, dict) or record.get("kind") != "frame":
            raise ValueError("Invalid replay record")
        offset = record.get("relative_ms")
        if type(offset) is not int or offset < 0 or offset < previous:
            raise ValueError("Invalid replay time")
        payload = validate_payload(record.get("payload"))
        frames.append((offset / 1000, json.dumps(payload).encode("utf-8")))
        previous = offset
    if not frames:
        raise ValueError("Replay contains no frames")
    return meta, frames

