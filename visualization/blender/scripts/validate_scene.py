import sys

import bpy

REQUIRED_OBJECTS = [
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
