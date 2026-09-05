import sys

import bpy

REQUIRED_OBJECTS = [
    "SIGAS_Ground_Slab",
    "SIGAS_Upper_Slab",
    "SIGAS_Roof_Main",
    "SIGAS_Dormer_Left",
    "SIGAS_Dormer_Right",
    "SIGAS_Kitchen",
    "SIGAS_Stove",
    "SIGAS_TechnicalRoom",
    "SIGAS_WaterHeater",
    "SIGAS_GasMeter",
    "SIGAS_MainValve",
    "SIGAS_AutoValve",
    "SIGAS_AutoValve_Handle",
    "SIGAS_MainPipe",
    "SIGAS_Pipe_Kitchen",
    "SIGAS_Pipe_Heater",
    "SIGAS_MQ2_Z1",
    "SIGAS_MQ2_Z2",
    "SIGAS_ESP32",
    "SIGAS_ControlPanel",
    "SIGAS_Buzzer",
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


def main():
    missing = [name for name in REQUIRED_OBJECTS if name not in bpy.data.objects]
    if missing:
        print("SIGAS_BLENDER_VALIDATE: FAIL missing=" + ",".join(missing))
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
    print("SIGAS_BLENDER_VALIDATE: PASS objects=" + str(len(bpy.data.objects)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
