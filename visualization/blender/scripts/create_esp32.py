from create_house import cube, cylinder
import math


def create_control_panel(mats, collection):
    cube("SIGAS_ControlPanel", (0.25, 1.45, 2.65), (1.75, 1.25, 0.24), mats["technical"], collection, bevel=0.06)
    cube("SIGAS_ControlPanel_Door", (0.25, 1.46, 2.66), (1.55, 1.05, 0.035), mats["glass"], collection)
    cube("SIGAS_ESP32", (0.0, 1.48, 2.80), (1.10, 0.58, 0.08), mats["pcb"], collection, bevel=0.025)
    cube("SIGAS_ESP32_USB", (-0.68, 1.48, 2.80), (0.18, 0.24, 0.10), mats["metal"], collection)
    cube("SIGAS_ESP32_Module", (0.12, 1.54, 2.80), (0.42, 0.30, 0.10), mats["black"], collection)
    cube("SIGAS_ESP32_Antenna", (0.47, 1.55, 2.80), (0.22, 0.42, 0.04), mats["metal"], collection)
    for i in range(6):
        cube(f"SIGAS_ESP32_Pin_{i + 1}", (-0.45 + i * 0.18, 1.50, 2.48), (0.05, 0.08, 0.12), mats["metal"], collection)
    cylinder("SIGAS_LedGreen", (-0.45, 1.58, 3.28), 0.09, 0.06, mats["normal"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cylinder("SIGAS_LedRed", (-0.18, 1.58, 3.28), 0.09, 0.06, mats["critical"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cylinder("SIGAS_Buzzer", (0.38, 1.58, 3.28), 0.18, 0.10, mats["warning"], rotation=(math.pi / 2, 0, 0), collection=collection)
    cylinder("SIGAS_Buzzer_Grill", (0.38, 1.64, 3.28), 0.12, 0.025, mats["black"], rotation=(math.pi / 2, 0, 0), vertices=20, collection=collection)
    cube("SIGAS_Control_TerminalBlock", (-0.58, 1.54, 2.23), (0.42, 0.22, 0.12), mats["warning"], collection)
    cube("SIGAS_ControlPanel_Label", (0.26, 2.08, 3.28), (1.35, 0.06, 0.18), mats["black"], collection)
