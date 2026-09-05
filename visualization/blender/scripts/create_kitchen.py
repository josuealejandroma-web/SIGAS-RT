from create_house import cylinder, cube
import math


def create_kitchen_equipment(mats, collection):
    cylinder("SIGAS_Kitchen_Hood", (-3.55, 1.85, -2.55), 0.18, 0.75, mats["metal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cube("SIGAS_Kitchen_Cabinet", (-4.15, 1.55, -2.35), (0.42, 1.1, 1.35), mats["wood"], collection)
