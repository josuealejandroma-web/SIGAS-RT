from create_house import empty


def create_markers(collection):
    markers = {
        "CameraFocus_Exterior": (0.0, 2.6, 6.5),
        "CameraFocus_Kitchen": (-3.45, 1.25, -2.25),
        "CameraFocus_Technical": (3.25, 1.35, -2.75),
        "CameraFocus_ControlPanel": (0.25, 1.45, 2.65),
        "CameraFocus_UpperFloor": (0.0, 4.3, 0.6),
        "CameraFocus_MeterValve": (-4.7, 1.0, -3.05),
        "CameraFocus_Cutaway": (0.0, 2.7, -0.35),
        "Marker_Leak_Z1": (-3.55, 1.18, -2.55),
        "Marker_Leak_Z2": (3.45, 1.62, -3.05),
        "Marker_Valve": (-0.45, 0.88, -3.05),
        "Marker_Meter": (-5.85, 1.05, -3.05),
        "Marker_ESP32": (0.0, 1.50, 2.80),
        "Cutaway_Helper": (0.0, 3.15, 0.0),
        "Floor_Ground_Helper": (0.0, 1.55, 0.0),
        "Floor_Upper_Helper": (0.0, 4.45, 0.0),
    }
    for name, location in markers.items():
        marker = empty(name, location, collection)
        marker["sigas_marker"] = True
