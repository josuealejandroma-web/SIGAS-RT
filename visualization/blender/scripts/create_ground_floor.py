from create_house import cube


def create_ground_floor_details(mats, collection):
    cube("SIGAS_Kitchen", (-3.35, 0.45, -2.35), (2.8, 0.9, 1.25), mats["wood"], collection)
    cube("SIGAS_Stove", (-3.55, 0.98, -2.55), (1.1, 0.12, 0.72), mats["metal"], collection)
    cube("SIGAS_Stove_Burner_A", (-3.82, 1.08, -2.72), (0.24, 0.035, 0.24), mats["black"], collection)
    cube("SIGAS_Stove_Burner_B", (-3.35, 1.08, -2.72), (0.24, 0.035, 0.24), mats["black"], collection)
    cube("SIGAS_Service_Counter", (3.0, 0.42, -2.85), (2.0, 0.84, 0.8), mats["wood"], collection)
    cube("SIGAS_TechnicalRoom", (3.05, 0.10, -1.95), (2.25, 0.10, 2.9), mats["floor"], collection)
    cube("SIGAS_WaterHeater", (3.45, 1.45, -3.28), (0.75, 1.9, 0.38), mats["metal"], collection)
    cube("SIGAS_Stairs", (0.75, 0.25, -0.9), (1.2, 0.25, 0.45), mats["wood"], collection)
    for i in range(7):
        cube(f"SIGAS_Stairs_Step_{i + 1}", (0.75, 0.30 + i * 0.22, -0.65 + i * 0.33), (1.2, 0.20, 0.35), mats["wood"], collection)
