import bpy


def material(name, color, metallic=0.0, roughness=0.65, alpha=1.0, emission=None, emission_strength=0.0, noise=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (color[0], color[1], color[2], alpha)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Alpha"].default_value = alpha
        if emission:
            bsdf.inputs["Emission Color"].default_value = (emission[0], emission[1], emission[2], 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        if noise:
            noise_node = mat.node_tree.nodes.new("ShaderNodeTexNoise")
            noise_node.inputs["Scale"].default_value = 18.0
            noise_node.inputs["Detail"].default_value = 8.0
            ramp = mat.node_tree.nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.elements[0].position = 0.22
            ramp.color_ramp.elements[0].color = (max(color[0] - 0.08, 0), max(color[1] - 0.08, 0), max(color[2] - 0.08, 0), alpha)
            ramp.color_ramp.elements[1].position = 1.0
            ramp.color_ramp.elements[1].color = (min(color[0] + 0.08, 1), min(color[1] + 0.08, 1), min(color[2] + 0.08, 1), alpha)
            mat.node_tree.links.new(noise_node.outputs["Fac"], ramp.inputs["Fac"])
            mat.node_tree.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
    return mat


def create_materials():
    return {
        "wall": material("SIGAS_Mat_Wall_White", (0.86, 0.88, 0.84), noise=True),
        "upper_wall": material("SIGAS_Mat_Wall_LightGray", (0.78, 0.80, 0.78), noise=True),
        "floor": material("SIGAS_Mat_Concrete", (0.45, 0.46, 0.43), noise=True),
        "wood": material("SIGAS_Mat_Wood", (0.46, 0.29, 0.14), roughness=0.48, noise=True),
        "roof": material("SIGAS_Mat_Roof_Terracotta", (0.50, 0.12, 0.08), roughness=0.72, noise=True),
        "glass": material("SIGAS_Mat_Glass", (0.42, 0.68, 0.88), alpha=0.45),
        "frame": material("SIGAS_Mat_Dark_Frame", (0.06, 0.07, 0.08)),
        "metal": material("SIGAS_Mat_Brushed_Metal", (0.55, 0.56, 0.54), metallic=0.7, roughness=0.35),
        "pipe": material("SIGAS_Mat_Gas_Pipe", (0.72, 0.67, 0.46), metallic=0.55, roughness=0.38),
        "gas": material("SIGAS_Mat_Gas_Conceptual", (0.95, 0.82, 0.20), alpha=0.38, emission=(0.95, 0.72, 0.10), emission_strength=0.25),
        "normal": material("SIGAS_Mat_Normal_Green", (0.05, 0.62, 0.24), emission=(0.02, 0.35, 0.10), emission_strength=0.25),
        "warning": material("SIGAS_Mat_Warning_Yellow", (0.95, 0.70, 0.08), emission=(0.75, 0.42, 0.02), emission_strength=0.35),
        "critical": material("SIGAS_Mat_Critical_Red", (0.86, 0.04, 0.03), emission=(0.80, 0.02, 0.02), emission_strength=0.45),
        "pcb": material("SIGAS_Mat_ESP32_PCB", (0.04, 0.30, 0.18)),
        "black": material("SIGAS_Mat_Technical_Black", (0.02, 0.02, 0.02)),
        "garden": material("SIGAS_Mat_Garden", (0.20, 0.45, 0.18), noise=True),
        "technical": material("SIGAS_Mat_Technical_Blue", (0.05, 0.18, 0.62), emission=(0.02, 0.10, 0.45), emission_strength=0.15),
        "cutaway": material("SIGAS_Mat_Cutaway_Transparent", (0.70, 0.78, 0.86), alpha=0.28),
    }
