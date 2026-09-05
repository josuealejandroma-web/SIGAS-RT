from create_house import cube, cylinder, torus
import math


def create_sensors(mats, collection):
    for name, x, y, z in (
        ("SIGAS_MQ2_Z1", -3.75, 1.35, -1.65),
        ("SIGAS_MQ2_Z2", 3.0, 1.35, -2.05),
    ):
        cylinder(name, (x, y, z), 0.20, 0.12, mats["normal"], rotation=(math.pi / 2, 0, 0), collection=collection)
        cylinder(name + "_MeshCap", (x, y, z + 0.08), 0.14, 0.08, mats["metal"], rotation=(math.pi / 2, 0, 0), vertices=20, collection=collection)
        cube(name + "_Bracket", (x, y - 0.18, z), (0.42, 0.08, 0.32), mats["black"], collection)
        torus(name + "_VentRing", (x, y, z + 0.13), 0.15, 0.012, mats["black"], rotation=(math.pi / 2, 0, 0), collection=collection)
        for pin in range(4):
            cube(f"{name}_Pin_{pin + 1}", (x - 0.15 + pin * 0.10, y - 0.22, z - 0.20), (0.035, 0.14, 0.035), mats["metal"], collection)
