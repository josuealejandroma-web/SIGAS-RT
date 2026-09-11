import bpy


TOUR_STOPS = (
    ("Entrada y bano de visitas", 1, (4.60, -3.15, 1.65), (3.30, -1.70, 0.75)),
    ("Sala", 37, (-1.95, -2.95, 1.65), (-3.65, -1.55, 0.80)),
    ("Comedor", 73, (-1.25, -0.65, 1.65), (-0.20, -1.55, 0.62)),
    ("Panel de control", 109, (-1.35, -1.75, 1.65), (0.25, -2.65, 1.40)),
    ("Cocina", 145, (-1.95, 0.20, 1.65), (-3.45, 2.40, 1.00)),
    ("Area tecnica", 181, (2.20, -0.45, 1.65), (3.25, 2.40, 1.15)),
    ("Valvula automatica de gas", 217, (1.25, 1.70, 1.60), (-0.45, 3.05, 0.75)),
    ("Escaleras", 253, (0.75, 1.25, 1.35), (0.75, -0.90, 1.45)),
    ("Pasillo superior", 289, (0.90, -2.45, 4.55), (0.90, 1.80, 4.10)),
    ("Dormitorio principal", 325, (-0.95, 0.90, 4.65), (-3.35, 2.30, 3.60)),
    ("Dormitorio 2", 361, (-0.35, -1.00, 4.65), (-3.05, -2.35, 3.60)),
    ("Dormitorio 3", 397, (0.95, -0.90, 4.65), (3.65, -2.35, 3.60)),
    ("Bano superior", 433, (3.00, 0.45, 4.65), (4.05, 2.25, 3.65)),
    ("Balcon", 469, (-1.55, -4.25, 4.45), (1.55, -4.25, 3.85)),
    ("Vista general", 505, (11.50, -15.00, 8.80), (0.00, 0.00, 2.80)),
)

MOVE_FRAMES = 24
HOLD_FRAMES = 10
END_PADDING_FRAMES = 24
PANEL_TRANSITION_HOLD_FRAME = 137
PANEL_TO_KITCHEN_WAYPOINTS = (
    (140, (-1.35, -2.82, 1.65)),
    (142, (-1.85, -2.82, 1.65)),
)


def _make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def _add_point_light(collection, name, location, energy):
    light_data = bpy.data.lights.new(name=name, type="POINT")
    light_data.energy = energy
    light_data.color = (1.0, 0.82, 0.62)
    light_data.shadow_soft_size = 0.75
    light = bpy.data.objects.new(name, light_data)
    light.location = location
    collection.objects.link(light)
    return light


def _animation_fcurves(obj):
    if obj.animation_data is None or obj.animation_data.action is None:
        return []
    action = obj.animation_data.action
    if hasattr(action, "fcurves"):
        return action.fcurves
    return [
        fcurve
        for layer in action.layers
        for strip in layer.strips
        for channelbag in strip.channelbags
        for fcurve in channelbag.fcurves
    ]


def _set_linear_interpolation(obj):
    for fcurve in _animation_fcurves(obj):
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def _remove_location_keyframe(obj, frame):
    for fcurve in _animation_fcurves(obj):
        if fcurve.data_path != "location":
            continue
        for keyframe in list(fcurve.keyframe_points):
            if abs(keyframe.co.x - frame) < 0.001:
                fcurve.keyframe_points.remove(keyframe)
        fcurve.update()


def _camera_end(camera_position, target_position):
    return tuple(
        camera_axis + (target_axis - camera_axis) * 0.12
        for camera_axis, target_axis in zip(camera_position, target_position)
    )


def apply_panel_to_kitchen_transition(camera):
    panel_stop = next(stop for stop in TOUR_STOPS if stop[0] == "Panel de control")
    panel_end = _camera_end(panel_stop[2], panel_stop[3])
    original_hold_frame = panel_stop[1] + MOVE_FRAMES + HOLD_FRAMES
    _remove_location_keyframe(camera, original_hold_frame)
    for frame, position in (
        (PANEL_TRANSITION_HOLD_FRAME, panel_end),
        *PANEL_TO_KITCHEN_WAYPOINTS,
    ):
        camera.location = position
        camera.keyframe_insert(data_path="location", frame=frame)
    _set_linear_interpolation(camera)


def _add_interior_lights(collection):
    lights = (
        ("SIGAS_TourLight_Entrance", (3.25, -2.20, 2.55), 145),
        ("SIGAS_TourLight_Living", (-3.20, -1.55, 2.55), 170),
        ("SIGAS_TourLight_Dining", (-0.20, -1.35, 2.55), 150),
        ("SIGAS_TourLight_Kitchen", (-3.35, 2.25, 2.55), 175),
        ("SIGAS_TourLight_Technical", (3.15, 2.30, 2.55), 165),
        ("SIGAS_TourLight_Master", (-3.20, 2.05, 5.45), 150),
        ("SIGAS_TourLight_Bedroom2", (-2.20, -2.00, 5.45), 140),
        ("SIGAS_TourLight_Bedroom3", (3.00, -1.85, 5.45), 140),
        ("SIGAS_TourLight_UpperBath", (3.45, 2.00, 5.45), 130),
    )
    for name, location, energy in lights:
        _add_point_light(collection, name, location, energy)


def create_interior_tour():
    scene = bpy.context.scene
    collection = _make_collection("SIGAS_BlenderInteriorTour")

    camera_data = bpy.data.cameras.new("SIGAS_Camera_Interior_Data")
    camera_data.lens = 18
    camera_data.clip_start = 0.05
    camera_data.clip_end = 80.0
    camera_data.display_size = 0.35
    camera_data.show_passepartout = True
    camera_data.passepartout_alpha = 0.72
    camera = bpy.data.objects.new("SIGAS_Camera_Interior", camera_data)
    camera["sigas_presentation_only"] = True
    camera["sigas_manual_navigation"] = "Camera to View is enabled"
    collection.objects.link(camera)

    target = bpy.data.objects.new("SIGAS_Camera_Interior_Target", None)
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.18
    target["sigas_presentation_only"] = True
    collection.objects.link(target)

    tracking = camera.constraints.new(type="TRACK_TO")
    tracking.name = "SIGAS_InteriorTour_Track"
    tracking.target = target
    tracking.track_axis = "TRACK_NEGATIVE_Z"
    tracking.up_axis = "UP_Y"

    for label, frame, camera_position, target_position in TOUR_STOPS:
        scene.timeline_markers.new(label, frame=frame)
        camera_end = _camera_end(camera_position, target_position)
        for keyframe_frame, keyed_camera_position in (
            (frame, camera_position),
            (frame + MOVE_FRAMES, camera_end),
            (frame + MOVE_FRAMES + HOLD_FRAMES, camera_end),
        ):
            camera.location = keyed_camera_position
            target.location = target_position
            camera.keyframe_insert(data_path="location", frame=keyframe_frame)
            target.keyframe_insert(data_path="location", frame=keyframe_frame)

    apply_panel_to_kitchen_transition(camera)
    _set_linear_interpolation(camera)
    _set_linear_interpolation(target)
    _add_interior_lights(collection)

    scene.frame_start = TOUR_STOPS[0][1]
    scene.frame_end = TOUR_STOPS[-1][1] + END_PADDING_FRAMES
    scene.render.fps = 24
    scene.camera = camera
    scene.frame_set(scene.frame_start)
    return camera
