from create_house import cube, cylinder
import math


def create_sensors(mats, collection):
    for name, x, y, z in (
        ("SIGAS_MQ2_Z1", -3.75, 1.35, -1.65),
        ("SIGAS_MQ2_Z2", 3.0, 1.35, -2.05),
    ):
        cylinder(name, (x, y, z), 0.20, 0.12, mats["normal"], rotation=(math.pi / 2, 0, 0), collection=collection)
        cylinder(name + "_MeshCap", (x, y, z + 0.08), 0.14, 0.08, mats["metal"], rotation=(math.pi / 2, 0, 0), vertices=20, collection=collection)
        cube(name + "_Bracket", (x, y - 0.18, z), (0.42, 0.08, 0.32), mats["black"], collection)
