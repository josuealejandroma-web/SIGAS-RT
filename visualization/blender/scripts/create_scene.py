import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from create_esp32 import create_control_panel
from create_camera_tour import create_interior_tour
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


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def orient_model_for_blender():
    """Keep authoring coordinates Godot-compatible while displaying Z-up in Blender."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.object
    root.name = "SIGAS_ModelRoot"
    root.empty_display_size = 0.8
    root["sigas_authoring_axes"] = "X right, Y up, Z depth"

    for obj in list(bpy.context.scene.objects):
        if obj != root:
            obj.parent = root

    root.rotation_euler.x = math.radians(90.0)
    return root


def add_lighting():
    world = bpy.context.scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.035, 0.05, 0.07, 1.0)
    background.inputs["Strength"].default_value = 0.35

    bpy.ops.object.light_add(type="SUN", location=(6, -10, 12))
    sun = bpy.context.object
    sun.name = "SIGAS_Sun"
    sun.data.energy = 2.0
    sun.data.angle = math.radians(18.0)
    sun.rotation_euler = (math.radians(35.0), 0.0, math.radians(-35.0))

    bpy.ops.object.light_add(type="AREA", location=(-4.0, -6.0, 10.0))
    area = bpy.context.object
    area.name = "SIGAS_AreaLight_Interior"
    area.data.energy = 900
    area.data.size = 8.0
    point_at(area, (0.0, 0.0, 2.8))

    bpy.ops.object.light_add(type="AREA", location=(7.0, 4.0, 6.5))
    fill = bpy.context.object
    fill.name = "SIGAS_AreaLight_Fill"
    fill.data.energy = 450
    fill.data.size = 5.0
    point_at(fill, (0.0, 0.0, 2.5))

    for name, location, energy in (
        ("SIGAS_WarmLight_Kitchen", (-3.4, 2.1, 2.35), 95),
        ("SIGAS_WarmLight_Technical", (3.2, 2.4, 2.25), 85),
        ("SIGAS_WarmLight_ControlPanel", (0.2, -2.5, 2.05), 70),
    ):
        bpy.ops.object.light_add(type="POINT", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = (1.0, 0.83, 0.58)


def add_camera():
    bpy.ops.object.camera_add(location=(14.0, -18.0, 10.5))
    camera = bpy.context.object
    camera.name = "SIGAS_Camera_Overview"
    point_at(camera, (0.0, 0.0, 2.8))
    camera.data.lens = 48
    camera.data.display_size = 0.8
    bpy.context.scene.camera = camera
    return camera


def configure_presentation(camera):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.unit_settings.system = "METRIC"

    bpy.ops.object.select_all(action="DESELECT")
    camera.select_set(True)
    bpy.context.view_layer.objects.active = camera

    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.region_3d.view_perspective = "CAMERA"
            space.shading.type = "MATERIAL"
            space.lock_camera = True
            space.overlay.show_floor = False
            space.overlay.show_axis_x = False
            space.overlay.show_axis_y = False
            space.overlay.show_relationship_lines = False


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
    orient_model_for_blender()
    add_lighting()
    camera = add_camera()

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 24
    configure_presentation(camera)

    project_root = repo_root()
    glb = export_glb(project_root)

    tour_camera = create_interior_tour()
    configure_presentation(tour_camera)
    blend = save_blend(project_root)
    print(f"SIGAS_BLENDER_SCENE: OK blend={blend} glb={glb}")


if __name__ == "__main__":
    build_scene()
