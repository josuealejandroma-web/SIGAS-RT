from create_house import cylinder, cube
import math


def create_technical_room_equipment(mats, collection):
    cylinder("SIGAS_Heater_Exhaust", (3.45, 2.52, -3.05), 0.12, 1.2, mats["metal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cube("SIGAS_Laundry_Block", (2.35, 0.55, -2.9), (0.65, 1.05, 0.75), mats["glass"], collection)
