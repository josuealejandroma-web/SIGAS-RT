import math
import sys

import bpy
from mathutils import Vector

TOUR_MARKERS = (
    ("Entrada y bano de visitas", 1),
    ("Sala", 37),
    ("Comedor", 73),
    ("Panel de control", 109),
    ("Cocina", 145),
    ("Area tecnica", 181),
    ("Valvula automatica de gas", 217),
    ("Escaleras", 253),
    ("Pasillo superior", 289),
    ("Dormitorio principal", 325),
    ("Dormitorio 2", 361),
    ("Dormitorio 3", 397),
    ("Bano superior", 433),
    ("Balcon", 469),
    ("Vista general", 505),
)
CAMERA_WALL_CLEARANCE = 0.001
TRANSITION_FRAMES = (143, 144, 145)

REQUIRED_OBJECTS = [
    "SIGAS_ModelRoot",
    "SIGAS_Camera_Overview",
    "SIGAS_Camera_Interior",
    "SIGAS_Camera_Interior_Target",
    "SIGAS_TourLight_Living",
    "SIGAS_TourLight_Master",
    "SIGAS_Ground_Slab",
    "SIGAS_Upper_Slab",
    "SIGAS_Roof_Main",
    "SIGAS_Dormer_Left",
    "SIGAS_Dormer_Right",
    "SIGAS_Roof_Ridge",
    "SIGAS_Roof_Gutter_Front",
    "SIGAS_Facade_Canopy",
    "SIGAS_Facade_Wood_Panel_Left",
    "SIGAS_Kitchen",
    "SIGAS_Stove",
    "SIGAS_Kitchen_Sink",
    "SIGAS_Kitchen_UpperCabinet_A",
    "SIGAS_TechnicalRoom",
    "SIGAS_WaterHeater",
    "SIGAS_Technical_ServiceShelf",
    "SIGAS_Living_Sofa",
    "SIGAS_Dining_Table",
    "SIGAS_Dining_Chair_1",
    "SIGAS_MasterBed_Pillow",
    "SIGAS_Bedroom_2_Desk",
    "SIGAS_GasMeter",
    "SIGAS_Meter_Needle",
    "SIGAS_MainValve",
    "SIGAS_MainValve_Handle",
    "SIGAS_AutoValve",
    "SIGAS_AutoValve_ActuatorBox",
    "SIGAS_AutoValve_Handle",
    "SIGAS_MainPipe",
    "SIGAS_Pipe_Kitchen",
    "SIGAS_Pipe_Heater",
    "SIGAS_Pipe_Support_1",
    "SIGAS_GasFlow_Arrow_1",
    "SIGAS_MQ2_Z1",
    "SIGAS_MQ2_Z1_VentRing",
    "SIGAS_MQ2_Z2",
    "SIGAS_MQ2_Z2_VentRing",
    "SIGAS_ESP32",
    "SIGAS_ESP32_Module",
    "SIGAS_ESP32_Antenna",
    "SIGAS_ControlPanel",
    "SIGAS_ControlPanel_Door",
    "SIGAS_Buzzer",
    "SIGAS_Buzzer_Grill",
    "SIGAS_LedGreen",
    "SIGAS_LedRed",
    "SIGAS_LeakPoint_Z1",
    "SIGAS_LeakPoint_Z2",
    "Marker_Leak_Z1",
    "Marker_Leak_Z2",
    "Marker_Valve",
    "Marker_Meter",
    "Marker_ESP32",
    "CameraFocus_Exterior",
    "CameraFocus_Kitchen",
    "CameraFocus_Technical",
    "CameraFocus_ControlPanel",
    "CameraFocus_UpperFloor",
    "Cutaway_Helper",
]


def point_intersects_bounds(point, obj, clearance=0.0):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
    maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
    return all(
        minimum[axis] - clearance <= point[axis] <= maximum[axis] + clearance
        for axis in range(3)
    )


def validate_camera_clear_of_walls(scene, camera):
    walls = [
        obj
        for obj in scene.objects
        if obj.type == "MESH" and "Wall" in obj.name
    ]
    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        position = camera.matrix_world.translation
        blocking_walls = [
            wall.name
            for wall in walls
            if point_intersects_bounds(position, wall, CAMERA_WALL_CLEARANCE)
        ]
        if blocking_walls:
            print(
                "SIGAS_BLENDER_VALIDATE: FAIL camera intersects wall clearance "
                f"frame={frame} walls={','.join(blocking_walls)}"
            )
            return False
        if frame in TRANSITION_FRAMES:
            print(
                "SIGAS_BLENDER_TRANSITION: PASS "
                f"frame={frame} position=({position.x:.3f},{position.y:.3f},{position.z:.3f})"
            )
    scene.frame_set(scene.frame_start)
    return True


def main():
    missing = [name for name in REQUIRED_OBJECTS if name not in bpy.data.objects]
    if missing:
        print("SIGAS_BLENDER_VALIDATE: FAIL missing=" + ",".join(missing))
        return 1
    model_root = bpy.data.objects["SIGAS_ModelRoot"]
    if abs(model_root.rotation_euler.x - math.radians(90.0)) > 0.001:
        print("SIGAS_BLENDER_VALIDATE: FAIL model root is not Blender Z-up")
        return 1
    scene = bpy.context.scene
    if scene.camera is None or scene.camera.name != "SIGAS_Camera_Interior":
        print("SIGAS_BLENDER_VALIDATE: FAIL interior tour camera is not active")
        return 1
    tour_camera = bpy.data.objects["SIGAS_Camera_Interior"]
    tour_target = bpy.data.objects["SIGAS_Camera_Interior_Target"]
    if tour_camera.animation_data is None or tour_camera.animation_data.action is None:
        print("SIGAS_BLENDER_VALIDATE: FAIL interior camera animation missing")
        return 1
    if tour_target.animation_data is None or tour_target.animation_data.action is None:
        print("SIGAS_BLENDER_VALIDATE: FAIL interior target animation missing")
        return 1
    marker_frames = {marker.name: marker.frame for marker in scene.timeline_markers}
    if len(scene.timeline_markers) != len(TOUR_MARKERS) or any(
        marker_frames.get(name) != frame for name, frame in TOUR_MARKERS
    ):
        print("SIGAS_BLENDER_VALIDATE: FAIL room markers are incomplete")
        return 1
    effective_fps = scene.render.fps / scene.render.fps_base
    duration_seconds = (scene.frame_end - scene.frame_start + 1) / effective_fps
    if (
        scene.frame_start != 1
        or scene.frame_end != 529
        or abs(effective_fps - 24.0) > 0.001
        or abs(duration_seconds - 22.0) > 0.2
    ):
        print("SIGAS_BLENDER_VALIDATE: FAIL interior tour is incomplete")
        return 1
    if tour_camera.get("sigas_manual_navigation") != "Camera to View is enabled":
        print("SIGAS_BLENDER_VALIDATE: FAIL manual camera navigation is not enabled")
        return 1
    view_spaces = [
        area.spaces.active
        for screen in bpy.data.screens
        for area in screen.areas
        if area.type == "VIEW_3D"
    ]
    if not view_spaces or any(not space.lock_camera for space in view_spaces):
        print("SIGAS_BLENDER_VALIDATE: FAIL camera-to-view lock is not enabled")
        return 1
    if not validate_camera_clear_of_walls(scene, tour_camera):
        return 1
    if "SIGAS_AutoValve_Handle" not in bpy.data.actions:
        animated = any(
            obj.animation_data is not None and obj.animation_data.action is not None
            for obj in bpy.data.objects
            if obj.name == "SIGAS_AutoValve_Handle"
        )
        if not animated:
            print("SIGAS_BLENDER_VALIDATE: FAIL valve animation missing")
            return 1
    print(
        "SIGAS_BLENDER_VALIDATE: PASS "
        f"objects={len(bpy.data.objects)} markers={len(scene.timeline_markers)} "
        f"frames={scene.frame_start}-{scene.frame_end} duration={duration_seconds:.2f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
