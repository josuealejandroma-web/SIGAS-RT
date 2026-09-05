import os
from pathlib import Path

import bpy


def export_glb(repo_root):
    godot_models = Path(repo_root) / "visualization" / "godot" / "models"
    blender_exports = Path(repo_root) / "visualization" / "blender" / "exports"
    godot_models.mkdir(parents=True, exist_ok=True)
    blender_exports.mkdir(parents=True, exist_ok=True)

    export_path = godot_models / "sigas_house.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(export_path),
        export_format="GLB",
        export_animations=True,
        export_apply=True,
        use_selection=False,
    )

    archive_path = blender_exports / "sigas_house.glb"
    if archive_path != export_path:
        archive_path.write_bytes(export_path.read_bytes())
    return export_path


def save_blend(repo_root):
    source = Path(repo_root) / "visualization" / "blender" / "source"
    source.mkdir(parents=True, exist_ok=True)
    blend_path = source / "sigas_house.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    return blend_path
