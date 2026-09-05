from create_house import cube


def create_upper_floor_details(mats, collection):
    cube("SIGAS_MasterBed", (-3.25, 3.45, -2.15), (1.7, 0.35, 1.9), mats["wood"], collection)
    cube("SIGAS_MasterBed_Pillow", (-3.25, 3.72, -2.92), (1.25, 0.16, 0.32), mats["wall"], collection)
    cube("SIGAS_Master_Nightstand", (-4.35, 3.42, -2.15), (0.38, 0.35, 0.42), mats["wood"], collection)
    cube("SIGAS_Bedroom_2_Bed", (-2.25, 3.45, 2.15), (1.55, 0.35, 1.35), mats["wood"], collection)
    cube("SIGAS_Bedroom_2_Desk", (-3.75, 3.45, 2.85), (0.85, 0.28, 0.42), mats["wood"], collection)
    cube("SIGAS_Bedroom_3_Bed", (3.1, 3.45, 2.0), (1.65, 0.35, 1.45), mats["wood"], collection)
    cube("SIGAS_Bedroom_3_Desk", (4.1, 3.45, 0.75), (0.85, 0.28, 0.42), mats["wood"], collection)
    cube("SIGAS_Upper_Bath_Fixture", (3.55, 3.45, -2.15), (0.85, 0.42, 0.55), mats["glass"], collection)
    cube("SIGAS_Upper_Bath_Vanity", (4.25, 3.48, -1.35), (0.52, 0.42, 0.42), mats["wood"], collection)
    cube("SIGAS_Terrace_Surface", (0, 3.62, 4.3), (3.8, 0.08, 0.95), mats["floor"], collection)
