from create_house import cylinder, cube
import math


def create_kitchen_equipment(mats, collection):
    cylinder("SIGAS_Kitchen_Hood", (-3.55, 1.85, -2.55), 0.18, 0.75, mats["metal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cube("SIGAS_Kitchen_Cabinet", (-4.15, 1.55, -2.35), (0.42, 1.1, 1.35), mats["wood"], collection)
    cube("SIGAS_Kitchen_Tile_BackSplash", (-3.35, 1.18, -3.52), (2.25, 0.98, 0.04), mats["glass"], collection)
    cube("SIGAS_Kitchen_GasLabel", (-3.62, 1.34, -2.98), (0.72, 0.12, 0.05), mats["warning"], collection)
