from create_house import cube


def create_stair_guard(mats, collection):
    cube("SIGAS_Stairs_Rail_Left", (0.05, 1.25, 0.25), (0.08, 1.6, 2.8), mats["frame"], collection)
    cube("SIGAS_Stairs_Rail_Right", (1.45, 1.25, 0.25), (0.08, 1.6, 2.8), mats["frame"], collection)
