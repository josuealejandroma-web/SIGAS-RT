from create_house import cube, cylinder
import math


def create_ground_floor_details(mats, collection):
    cube("SIGAS_Kitchen", (-3.35, 0.45, -2.35), (2.8, 0.9, 1.25), mats["wood"], collection)
    cube("SIGAS_Stove", (-3.55, 0.98, -2.55), (1.1, 0.12, 0.72), mats["metal"], collection)
    cube("SIGAS_Stove_Burner_A", (-3.82, 1.08, -2.72), (0.24, 0.035, 0.24), mats["black"], collection)
    cube("SIGAS_Stove_Burner_B", (-3.35, 1.08, -2.72), (0.24, 0.035, 0.24), mats["black"], collection)
    cube("SIGAS_Kitchen_Sink", (-2.75, 1.02, -2.10), (0.58, 0.08, 0.42), mats["metal"], collection)
    cylinder("SIGAS_Kitchen_Faucet", (-2.75, 1.20, -2.08), 0.035, 0.42, mats["metal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cube("SIGAS_Kitchen_UpperCabinet_A", (-4.0, 1.85, -2.95), (0.62, 0.75, 0.22), mats["wood"], collection)
    cube("SIGAS_Kitchen_UpperCabinet_B", (-3.25, 1.85, -2.95), (0.62, 0.75, 0.22), mats["wood"], collection)
    cube("SIGAS_Service_Counter", (3.0, 0.42, -2.85), (2.0, 0.84, 0.8), mats["wood"], collection)
    cube("SIGAS_TechnicalRoom", (3.05, 0.10, -1.95), (2.25, 0.10, 2.9), mats["floor"], collection)
    cube("SIGAS_WaterHeater", (3.45, 1.45, -3.28), (0.75, 1.9, 0.38), mats["metal"], collection)
    cube("SIGAS_GuestBath_Vanity", (3.75, 0.46, 1.9), (0.62, 0.78, 0.42), mats["wood"], collection)
    cylinder("SIGAS_GuestBath_Sink", (3.75, 0.91, 1.9), 0.18, 0.08, mats["glass"], collection=collection)
    cylinder("SIGAS_GuestBath_Toilet", (2.82, 0.42, 1.45), 0.23, 0.36, mats["glass"], collection=collection)
    cube("SIGAS_Living_Sofa", (-3.85, 0.42, 1.65), (1.55, 0.55, 0.72), mats["wood"], collection)
    cube("SIGAS_Living_Sofa_Back", (-3.85, 0.82, 1.98), (1.55, 0.75, 0.14), mats["wood"], collection)
    cube("SIGAS_Living_Table", (-2.45, 0.32, 1.65), (0.82, 0.20, 0.52), mats["glass"], collection)
    cube("SIGAS_Living_TV", (-1.75, 1.20, 3.42), (1.05, 0.62, 0.08), mats["black"], collection)
    cube("SIGAS_Dining_Table", (-0.20, 0.55, 1.50), (1.12, 0.18, 0.82), mats["wood"], collection)
    for i, (x, z) in enumerate(((-0.95, 1.5), (0.55, 1.5), (-0.20, 0.85), (-0.20, 2.15))):
        cube(f"SIGAS_Dining_Chair_{i + 1}", (x, 0.36, z), (0.36, 0.36, 0.36), mats["wood"], collection)
    cube("SIGAS_Stairs", (0.75, 0.25, -0.9), (1.2, 0.25, 0.45), mats["wood"], collection)
    for i in range(7):
        cube(f"SIGAS_Stairs_Step_{i + 1}", (0.75, 0.30 + i * 0.22, -0.65 + i * 0.33), (1.2, 0.20, 0.35), mats["wood"], collection)
