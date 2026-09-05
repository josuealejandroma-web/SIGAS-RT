from create_house import cube


def create_upper_floor_details(mats, collection):
    cube("SIGAS_MasterBed", (-3.25, 3.45, -2.15), (1.7, 0.35, 1.9), mats["wood"], collection)
    cube("SIGAS_Bedroom_2_Bed", (-2.25, 3.45, 2.15), (1.55, 0.35, 1.35), mats["wood"], collection)
    cube("SIGAS_Bedroom_3_Bed", (3.1, 3.45, 2.0), (1.65, 0.35, 1.45), mats["wood"], collection)
    cube("SIGAS_Upper_Bath_Fixture", (3.55, 3.45, -2.15), (0.85, 0.42, 0.55), mats["glass"], collection)
    cube("SIGAS_Terrace_Surface", (0, 3.62, 4.3), (3.8, 0.08, 0.95), mats["floor"], collection)
