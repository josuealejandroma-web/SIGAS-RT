"""Blender --python entry point; safe to run again from the Text Editor."""

from pathlib import Path
import sys

repo = str(Path(__file__).resolve().parents[3])
if repo not in sys.path:
    sys.path.insert(0, repo)

import visualization.blender.live as live

live.unregister()
live.register()
live.get_runtime().start()
print("SIGAS_BLENDER_LIVE: READY UDP=127.0.0.1:45701 commands=127.0.0.1:45702")
