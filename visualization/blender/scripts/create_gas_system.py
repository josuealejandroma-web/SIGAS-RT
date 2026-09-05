from create_house import cone, cube, cylinder, pipe_curve, sphere, torus
import math


def create_gas_system(mats, collection):
    pipe_curve("SIGAS_MainPipe", [(-6.2, 0.55, -3.05), (-4.7, 0.55, -3.05), (0.0, 0.55, -3.05), (3.4, 0.55, -3.05)], mats["pipe"], collection=collection)
    pipe_curve("SIGAS_Pipe_Kitchen", [(-3.35, 0.55, -3.05), (-3.35, 0.55, -2.55), (-3.55, 0.85, -2.55)], mats["pipe"], bevel=0.045, collection=collection)
    pipe_curve("SIGAS_Pipe_Heater", [(3.25, 0.55, -3.05), (3.45, 0.80, -3.05), (3.45, 1.35, -3.05)], mats["pipe"], bevel=0.045, collection=collection)
    cube("SIGAS_GasMeter", (-5.85, 1.05, -3.05), (0.65, 0.95, 0.38), mats["metal"], collection, bevel=0.05)
    cylinder("SIGAS_Meter_Dial", (-5.85, 1.08, -2.84), 0.22, 0.04, mats["glass"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cylinder("SIGAS_Meter_Needle", (-5.85, 1.08, -2.80), 0.012, 0.34, mats["critical"], rotation=(math.pi / 2, 0, math.radians(35)), collection=collection)
    cube("SIGAS_Meter_Label", (-5.85, 0.62, -2.82), (0.44, 0.14, 0.04), mats["black"], collection)
    cylinder("SIGAS_MainValve", (-4.95, 0.62, -3.05), 0.18, 0.38, mats["critical"], rotation=(0, math.pi / 2, 0), collection=collection)
    cube("SIGAS_MainValve_Handle", (-4.95, 0.88, -3.05), (0.85, 0.07, 0.12), mats["critical"], collection)
    cylinder("SIGAS_AutoValve", (-0.45, 0.62, -3.05), 0.22, 0.42, mats["technical"], rotation=(0, math.pi / 2, 0), collection=collection)
    cube("SIGAS_AutoValve_ActuatorBox", (-0.45, 1.04, -2.72), (0.55, 0.42, 0.35), mats["technical"], collection)
    handle = cube("SIGAS_AutoValve_Handle", (-0.45, 0.92, -3.05), (0.14, 0.08, 0.95), mats["normal"], collection)
    handle["state_open_degrees_y"] = 0.0
    handle["state_closed_degrees_y"] = 90.0
    handle.keyframe_insert(data_path="rotation_euler", frame=1)
    handle.rotation_euler[1] = math.radians(90)
    handle.keyframe_insert(data_path="rotation_euler", frame=24)
    for i, x in enumerate((-5.85, -4.95, -3.35, -0.45, 1.6, 3.25)):
        cube(f"SIGAS_Pipe_Support_{i + 1}", (x, 0.30, -3.05), (0.08, 0.48, 0.18), mats["metal"], collection)
        torus(f"SIGAS_Pipe_Collar_{i + 1}", (x, 0.55, -3.05), 0.09, 0.012, mats["metal"], rotation=(0, math.pi / 2, 0), collection=collection)
    for i, x in enumerate((-5.2, -2.4, 0.9, 2.6)):
        cone(f"SIGAS_GasFlow_Arrow_{i + 1}", (x, 0.58, -2.75), 0.13, 0.0, 0.35, mats["warning"], rotation=(math.pi / 2, 0, -math.pi / 2), collection=collection)
    sphere("SIGAS_LeakPoint_Z1", (-3.55, 1.18, -2.55), 0.16, mats["gas"], collection)
    sphere("SIGAS_LeakPoint_Z2", (3.45, 1.62, -3.05), 0.16, mats["gas"], collection)
