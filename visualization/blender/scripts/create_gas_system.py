from create_house import cube, cylinder, pipe_curve, sphere
import math


def create_gas_system(mats, collection):
    pipe_curve("SIGAS_MainPipe", [(-6.2, 0.55, -3.05), (-4.7, 0.55, -3.05), (0.0, 0.55, -3.05), (3.4, 0.55, -3.05)], mats["pipe"], collection=collection)
    pipe_curve("SIGAS_Pipe_Kitchen", [(-3.35, 0.55, -3.05), (-3.35, 0.55, -2.55), (-3.55, 0.85, -2.55)], mats["pipe"], bevel=0.045, collection=collection)
    pipe_curve("SIGAS_Pipe_Heater", [(3.25, 0.55, -3.05), (3.45, 0.80, -3.05), (3.45, 1.35, -3.05)], mats["pipe"], bevel=0.045, collection=collection)
    cube("SIGAS_GasMeter", (-5.85, 1.05, -3.05), (0.65, 0.95, 0.38), mats["metal"], collection)
    cylinder("SIGAS_Meter_Dial", (-5.85, 1.08, -2.84), 0.22, 0.04, mats["glass"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cylinder("SIGAS_MainValve", (-4.95, 0.62, -3.05), 0.18, 0.38, mats["critical"], rotation=(0, math.pi / 2, 0), collection=collection)
    cylinder("SIGAS_AutoValve", (-0.45, 0.62, -3.05), 0.22, 0.42, mats["technical"], rotation=(0, math.pi / 2, 0), collection=collection)
    handle = cube("SIGAS_AutoValve_Handle", (-0.45, 0.92, -3.05), (0.14, 0.08, 0.95), mats["normal"], collection)
    handle["state_open_degrees_y"] = 0.0
    handle["state_closed_degrees_y"] = 90.0
    handle.keyframe_insert(data_path="rotation_euler", frame=1)
    handle.rotation_euler[1] = math.radians(90)
    handle.keyframe_insert(data_path="rotation_euler", frame=24)
    sphere("SIGAS_LeakPoint_Z1", (-3.55, 1.18, -2.55), 0.16, mats["gas"], collection)
    sphere("SIGAS_LeakPoint_Z2", (3.45, 1.62, -3.05), 0.16, mats["gas"], collection)
