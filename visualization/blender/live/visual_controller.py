"""Temporary Blender presentation overrides, exclusively on the main thread."""

import math
import threading

import bpy
from mathutils import Vector

REQUIRED_OBJECTS = (
    "SIGAS_MQ2_Z1", "SIGAS_MQ2_Z2", "SIGAS_LeakPoint_Z1", "SIGAS_LeakPoint_Z2",
    "SIGAS_AutoValve", "SIGAS_AutoValve_Handle", "SIGAS_AutoValve_ActuatorBox",
    "SIGAS_LedGreen", "SIGAS_LedRed", "SIGAS_Buzzer", "SIGAS_Buzzer_Grill",
    "SIGAS_ESP32", "SIGAS_ControlPanel",
)


def main_thread_only():
    if threading.current_thread() is not threading.main_thread():
        raise RuntimeError("Blender scene access requires the main thread")


class VisualController:
    def __init__(self):
        main_thread_only()
        missing = [name for name in REQUIRED_OBJECTS if name not in bpy.data.objects]
        if missing:
            raise ValueError("Missing Blender objects: " + ", ".join(missing))
        self.objects = {name: bpy.data.objects[name] for name in REQUIRED_OBJECTS}
        self.saved = {}
        self.materials = {}
        self.particles = []
        self.meshes = []
        self.collection = None
        self.closed = False
        self.buzzer_on = False
        self.zones = [False, False]
        self.started_at = 0.0
        self.valve_target = None
        handle = self.objects["SIGAS_AutoValve_Handle"]
        self.rotation = handle.rotation_euler.copy()
        self.action = handle.animation_data.action if handle.animation_data else None
        self.slot = handle.animation_data.action_slot if self.action else None
        self.start_angle = handle.rotation_euler.y
        self.end_angle = self.start_angle
        try:
            for name, obj in self.objects.items():
                self.saved[name] = ([(s.link, s.material) for s in obj.material_slots],
                                    obj.hide_get(), obj.hide_render)
            if self.action:
                handle.animation_data.action = None
            self._create_materials()
            for name in ("SIGAS_MQ2_Z1", "SIGAS_MQ2_Z2", "SIGAS_LedGreen", "SIGAS_LedRed",
                         "SIGAS_Buzzer", "SIGAS_Buzzer_Grill", "SIGAS_AutoValve_Handle"):
                self._material(name, "Unknown")
            self._create_particles()
            for zone in (1, 2):
                self._leak_visible(zone, False)
        except BaseException:
            self.restore()
            raise

    def _create_materials(self):
        specs = {
            "Unknown": ((0.25, 0.27, 0.29, 1), 0),
            "Sensor_Normal": ((0.06, 0.7, 0.24, 1), 0.5),
            "Sensor_Warning": ((1, 0.55, 0.025, 1), 0.8),
            "Sensor_High": ((0.95, 0.045, 0.045, 1), 1.2),
            "Green_On": ((0.025, 0.9, 0.15, 1), 2.0),
            "Green_Off": ((0.015, 0.065, 0.025, 1), 0),
            "Red_On": ((1, 0.025, 0.02, 1), 2.0),
            "Red_Off": ((0.09, 0.013, 0.01, 1), 0),
            "Buzzer_On": ((1, 0.6, 0.06, 1), 1.2),
            "Buzzer_Off": ((0.045, 0.045, 0.05, 1), 0),
            "Leak_Z1": ((0.1, 0.85, 0.5, 0.3), 0.4),
            "Leak_Z2": ((0.1, 0.65, 1, 0.3), 0.4),
        }
        for label, (color, emission) in specs.items():
            mat = bpy.data.materials.new("SIGAS_LIVE_" + label)
            self.materials[label] = mat
            mat.use_nodes = True
            mat.diffuse_color = color
            shader = mat.node_tree.nodes.get("Principled BSDF")
            shader.inputs["Base Color"].default_value = color
            shader.inputs["Roughness"].default_value = 0.45
            shader.inputs["Emission Color"].default_value = (*color[:3], 1)
            shader.inputs["Emission Strength"].default_value = emission
            shader.inputs["Alpha"].default_value = color[3]
            if color[3] < 1:
                mat.surface_render_method = "DITHERED"

    def _material(self, name, label):
        obj = self.objects[name]
        for slot in obj.material_slots:
            slot.link = "OBJECT"
            slot.material = self.materials[label]

    def _create_particles(self):
        self.collection = bpy.data.collections.new("SIGAS_LIVE_ConceptualLeaks")
        bpy.context.scene.collection.children.link(self.collection)
        # Low-poly octahedra share one mesh per zone; no physics or volume simulation.
        vertices = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
        faces = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4),
                 (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]
        for zone in (1, 2):
            mesh = bpy.data.meshes.new(f"SIGAS_LIVE_LeakMesh_Z{zone}")
            self.meshes.append(mesh)
            mesh.from_pydata(vertices, [], faces)
            mesh.materials.append(self.materials[f"Leak_Z{zone}"])
            for index in range(8):
                obj = bpy.data.objects.new(f"SIGAS_LIVE_Particle_Z{zone}_{index}", mesh)
                self.collection.objects.link(obj)
                self.particles.append((zone, index, obj))

    def _leak_visible(self, zone, visible):
        marker = self.objects[f"SIGAS_LeakPoint_Z{zone}"]
        marker.hide_set(not visible)
        marker.hide_render = not visible
        self._material(marker.name, f"Leak_Z{zone}")
        for particle_zone, _, obj in self.particles:
            if particle_zone == zone:
                obj.hide_set(not visible)
                obj.hide_render = not visible

    def apply(self, frame, now):
        main_thread_only()
        if self.closed:
            return
        for zone in (1, 2):
            level = frame[f"zone{zone}_level"]
            self._material(f"SIGAS_MQ2_Z{zone}", "Sensor_" + level.title())
            self.zones[zone - 1] = level == "HIGH"
            self._leak_visible(zone, level == "HIGH")
        self._material("SIGAS_LedGreen", "Green_On" if frame["green_led"] else "Green_Off")
        self._material("SIGAS_LedRed", "Red_On" if frame["red_led"] else "Red_Off")
        self.buzzer_on = frame["buzzer"]
        for name in ("SIGAS_Buzzer", "SIGAS_Buzzer_Grill"):
            self._material(name, "Buzzer_On" if self.buzzer_on else "Buzzer_Off")
        handle = self.objects["SIGAS_AutoValve_Handle"]
        if frame["valve"] != self.valve_target:
            self.start_angle = handle.rotation_euler.y
            self.end_angle = math.radians(handle[f"state_{frame['valve'].lower()}_degrees_y"])
            self.started_at = now
            self.valve_target = frame["valve"]
        self._material(handle.name, "Sensor_Normal" if frame["valve"] == "OPEN" else "Sensor_High")

    def animate(self, now, fresh):
        main_thread_only()
        if self.closed:
            return
        if self.valve_target is not None:
            alpha = min(1, max(0, (now - self.started_at) / 0.3))
            self.objects["SIGAS_AutoValve_Handle"].rotation_euler.y = (
                self.start_angle + (self.end_angle - self.start_angle) * alpha)
        if not fresh:
            return
        for zone, index, obj in self.particles:
            if not self.zones[zone - 1]:
                continue
            origin = self.objects[f"SIGAS_LeakPoint_Z{zone}"].matrix_world.translation
            phase = (now * 0.35 + index / 8) % 1
            angle = index * 2.4
            obj.location = origin + Vector((math.cos(angle) * 0.23 * phase,
                                            math.sin(angle) * 0.23 * phase, phase * 0.8))
            obj.scale = (0.06 + phase * 0.13,) * 3
        shader = self.materials["Buzzer_On"].node_tree.nodes.get("Principled BSDF")
        shader.inputs["Emission Strength"].default_value = 1.2 + 0.35 * math.sin(now * 5)

    def restore(self):
        main_thread_only()
        if self.closed:
            return
        self.closed = True
        for name, (slots, hidden, render_hidden) in self.saved.items():
            obj = self.objects[name]
            for slot, (link, material) in zip(obj.material_slots, slots):
                slot.material = material
                slot.link = link
            obj.hide_set(hidden)
            obj.hide_render = render_hidden
        handle = self.objects["SIGAS_AutoValve_Handle"]
        if self.action:
            handle.animation_data.action = self.action
            handle.animation_data.action_slot = self.slot
        handle.rotation_euler = self.rotation
        for _, _, obj in self.particles:
            bpy.data.objects.remove(obj, do_unlink=True)
        if self.collection is not None:
            bpy.data.collections.remove(self.collection)
        for mesh in self.meshes:
            bpy.data.meshes.remove(mesh)
        for mat in self.materials.values():
            bpy.data.materials.remove(mat)

