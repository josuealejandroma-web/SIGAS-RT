import sys
from pathlib import Path

import bpy
from mathutils import Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from create_esp32 import create_control_panel
from create_gas_system import create_gas_system
from create_ground_floor import create_ground_floor_details
from create_house import create_house_shell, make_collection
from create_kitchen import create_kitchen_equipment
from create_markers import create_markers
from create_materials import create_materials
from create_stairs import create_stair_guard
from create_technical_room import create_technical_room_equipment
from create_upper_floor import create_upper_floor_details
from create_sensors import create_sensors
from export_assets import export_glb, save_blend


def repo_root():
    return SCRIPT_DIR.parents[2]


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def add_lighting():
    bpy.ops.object.light_add(type="SUN", location=(0, 8, 6))
    sun = bpy.context.object
    sun.name = "SIGAS_Sun"
    sun.data.energy = 1.65
    sun.rotation_euler = (0.85, 0.0, -0.65)

    bpy.ops.object.light_add(type="AREA", location=(0, 5.8, 3.5))
    area = bpy.context.object
    area.name = "SIGAS_AreaLight_Interior"
    area.data.energy = 520
    area.data.size = 6.5

    for name, location, energy in (
        ("SIGAS_WarmLight_Kitchen", (-3.4, 2.35, -2.1), 95),
        ("SIGAS_WarmLight_Technical", (3.2, 2.25, -2.4), 85),
        ("SIGAS_WarmLight_ControlPanel", (0.2, 2.05, 2.5), 70),
    ):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = (1.0, 0.83, 0.58)


def add_camera():
    bpy.ops.object.camera_add(location=(12.5, 9.2, 12.0), rotation=(1.04, 0.0, 0.78))
    camera = bpy.context.object
    camera.name = "SIGAS_Camera_Overview"
    direction = Vector((0.0, 2.6, 0.2)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 23
    bpy.context.scene.camera = camera


def build_scene():
    reset_scene()
    mats = create_materials()
    create_house_shell(mats)

    ground_assets = make_collection("SIGAS_GroundFloor_Assets")
    upper_assets = make_collection("SIGAS_UpperFloor_Assets")
    gas_assets = make_collection("SIGAS_GasSystem")
    control_assets = make_collection("SIGAS_ControlSystem")
    marker_assets = make_collection("SIGAS_Markers")

    create_ground_floor_details(mats, ground_assets)
    create_kitchen_equipment(mats, ground_assets)
    create_technical_room_equipment(mats, ground_assets)
    create_stair_guard(mats, ground_assets)
    create_upper_floor_details(mats, upper_assets)
    create_gas_system(mats, gas_assets)
    create_sensors(mats, control_assets)
    create_control_panel(mats, control_assets)
    create_markers(marker_assets)
    add_lighting()
    add_camera()

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 24
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    bpy.context.scene.unit_settings.system = "METRIC"

    root = repo_root()
    blend = save_blend(root)
    glb = export_glb(root)
    print(f"SIGAS_BLENDER_SCENE: OK blend={blend} glb={glb}")


if __name__ == "__main__":
    build_scene()
