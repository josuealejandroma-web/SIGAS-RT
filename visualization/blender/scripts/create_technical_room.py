from create_house import cylinder, cube
import math


def create_technical_room_equipment(mats, collection):
    cylinder("SIGAS_Heater_Exhaust", (3.45, 2.52, -3.05), 0.12, 1.2, mats["metal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cube("SIGAS_Laundry_Block", (2.35, 0.55, -2.9), (0.65, 1.05, 0.75), mats["glass"], collection)
    cube("SIGAS_Technical_ServiceShelf", (2.45, 1.65, -1.55), (0.90, 0.08, 0.42), mats["metal"], collection)
    cube("SIGAS_Technical_WarningPlate", (3.45, 1.98, -3.03), (0.52, 0.16, 0.04), mats["warning"], collection)
