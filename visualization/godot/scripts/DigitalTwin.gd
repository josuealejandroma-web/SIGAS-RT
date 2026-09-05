extends Node3D

const NORMAL_COLOR := Color(0.1, 0.62, 0.28)
const WARNING_COLOR := Color(0.95, 0.72, 0.1)
const CRITICAL_COLOR := Color(0.85, 0.08, 0.06)
const FAULT_COLOR := Color(0.55, 0.08, 0.08)
const SAFE_COLOR := Color(0.18, 0.42, 0.92)

var sensor_z1: MeshInstance3D
var sensor_z2: MeshInstance3D
var valve_body: MeshInstance3D
var valve_handle: MeshInstance3D
var gas_z1: Array[MeshInstance3D] = []
var gas_z2: Array[MeshInstance3D] = []
var led_green: MeshInstance3D
var led_red: MeshInstance3D
var buzzer: MeshInstance3D
var esp32: MeshInstance3D
var status_materials := {}


func _ready() -> void:
	_create_materials()
	_create_house()
	_create_gas_system()
	_create_controller()


func apply_telemetry(frame: Dictionary) -> void:
	var state := str(frame.get("state", "SYSTEM_STARTUP"))
	var zone1_level := str(frame.get("zone1_level", "NORMAL"))
	var zone2_level := str(frame.get("zone2_level", "NORMAL"))
	var valve := str(frame.get("valve", "CLOSED"))
	var buzzer_on := bool(frame.get("buzzer", false))

	sensor_z1.material_override = _material_for_level(zone1_level)
	sensor_z2.material_override = _material_for_level(zone2_level)
	esp32.material_override = _material_for_state(state)
	led_green.material_override = status_materials["green_on"] if state == "SYSTEM_NORMAL" else status_materials["green_off"]
	led_red.material_override = status_materials["red_on"] if valve == "CLOSED" or state in ["SYSTEM_CRITICAL", "SYSTEM_SAFE_LATCHED", "SYSTEM_FAULT"] else status_materials["red_off"]
	buzzer.material_override = status_materials["buzzer_on"] if buzzer_on else status_materials["buzzer_off"]

	var closed := valve == "CLOSED"
	valve_body.material_override = status_materials["valve_closed"] if closed else status_materials["valve_open"]
	valve_handle.rotation_degrees.y = 90.0 if closed else 0.0

	_set_gas_visible(gas_z1, zone1_level != "NORMAL")
	_set_gas_visible(gas_z2, zone2_level != "NORMAL")


func _create_materials() -> void:
	status_materials["floor"] = _mat(Color(0.45, 0.46, 0.43))
	status_materials["wall"] = _mat(Color(0.84, 0.86, 0.82))
	status_materials["roof"] = _mat(Color(0.55, 0.16, 0.12))
	status_materials["pipe"] = _mat(Color(0.62, 0.62, 0.58), 0.25)
	status_materials["appliance"] = _mat(Color(0.18, 0.19, 0.2))
	status_materials["normal"] = _mat(NORMAL_COLOR, 0.15)
	status_materials["warning"] = _mat(WARNING_COLOR, 0.2)
	status_materials["critical"] = _mat(CRITICAL_COLOR, 0.2)
	status_materials["fault"] = _mat(FAULT_COLOR, 0.2)
	status_materials["safe"] = _mat(SAFE_COLOR, 0.2)
	status_materials["valve_open"] = _mat(Color(0.05, 0.5, 0.2), 0.2)
	status_materials["valve_closed"] = _mat(Color(0.8, 0.06, 0.04), 0.2)
	status_materials["green_on"] = _mat(Color(0.0, 0.95, 0.35), 0.6)
	status_materials["green_off"] = _mat(Color(0.02, 0.12, 0.04))
	status_materials["red_on"] = _mat(Color(1.0, 0.05, 0.02), 0.6)
	status_materials["red_off"] = _mat(Color(0.16, 0.02, 0.02))
	status_materials["buzzer_on"] = _mat(Color(0.95, 0.78, 0.06), 0.3)
	status_materials["buzzer_off"] = _mat(Color(0.18, 0.16, 0.08))
	status_materials["gas"] = _mat(Color(0.8, 0.75, 0.15, 0.45), 0.7, true)


func _create_house() -> void:
	_add_box("Floor", Vector3(0, -0.05, 0), Vector3(10, 0.1, 7), status_materials["floor"])
	_add_box("BackWall", Vector3(0, 1.5, -3.5), Vector3(10, 3, 0.12), status_materials["wall"])
	_add_box("LeftWall", Vector3(-5, 1.5, 0), Vector3(0.12, 3, 7), status_materials["wall"])
	_add_box("RightWall", Vector3(5, 1.5, 0), Vector3(0.12, 3, 7), status_materials["wall"])
	_add_box("ServiceWall", Vector3(0, 1.5, 0.2), Vector3(0.1, 3, 6.6), status_materials["wall"])
	_add_box("RoofHint", Vector3(0, 3.15, -1.1), Vector3(10.2, 0.18, 4.9), status_materials["roof"])

	_add_box("KitchenCounter", Vector3(-2.9, 0.45, -2.35), Vector3(2.8, 0.9, 0.85), status_materials["appliance"])
	_add_box("Stove", Vector3(-3.1, 0.95, -2.35), Vector3(1.0, 0.12, 0.65), status_materials["pipe"])
	_add_box("WaterHeater", Vector3(2.8, 1.35, -3.25), Vector3(0.9, 1.8, 0.35), status_materials["appliance"])
	_add_box("MainDoor", Vector3(4.95, 1.0, 1.8), Vector3(0.08, 2.0, 1.1), _mat(Color(0.38, 0.23, 0.12)))


func _create_gas_system() -> void:
	_add_cylinder("MainPipe", Vector3(0, 0.45, -2.8), Vector3(0, 0, 90), 0.07, 7.0, status_materials["pipe"])
	_add_cylinder("BranchPipeZ1", Vector3(-3.2, 0.45, -2.0), Vector3(90, 0, 0), 0.05, 1.7, status_materials["pipe"])
	_add_cylinder("BranchPipeZ2", Vector3(2.8, 0.45, -2.4), Vector3(90, 0, 0), 0.05, 1.1, status_materials["pipe"])
	valve_body = _add_cylinder("ServoValve", Vector3(0, 0.52, -2.8), Vector3(0, 0, 90), 0.19, 0.35, status_materials["valve_closed"])
	valve_handle = _add_box("ValveHandle", Vector3(0, 0.78, -2.8), Vector3(0.12, 0.08, 0.95), status_materials["safe"])

	sensor_z1 = _add_cylinder("SensorZone1", Vector3(-3.6, 1.15, -1.65), Vector3(0, 0, 0), 0.22, 0.18, status_materials["normal"])
	sensor_z2 = _add_cylinder("SensorZone2", Vector3(3.1, 1.15, -2.0), Vector3(0, 0, 0), 0.22, 0.18, status_materials["normal"])
	_create_gas_cloud(gas_z1, Vector3(-3.4, 1.25, -1.9))
	_create_gas_cloud(gas_z2, Vector3(2.9, 1.25, -2.25))


func _create_controller() -> void:
	esp32 = _add_box("ESP32", Vector3(0, 1.25, 1.8), Vector3(1.25, 0.08, 0.8), status_materials["safe"])
	led_green = _add_cylinder("LedGreen", Vector3(-0.42, 1.36, 1.78), Vector3(90, 0, 0), 0.08, 0.05, status_materials["green_off"])
	led_red = _add_cylinder("LedRed", Vector3(-0.18, 1.36, 1.78), Vector3(90, 0, 0), 0.08, 0.05, status_materials["red_on"])
	buzzer = _add_cylinder("Buzzer", Vector3(0.36, 1.37, 1.78), Vector3(90, 0, 0), 0.16, 0.08, status_materials["buzzer_off"])
	_add_cylinder("WireZ1", Vector3(-1.8, 1.18, 0.05), Vector3(65, 0, -62), 0.015, 4.4, status_materials["safe"])
	_add_cylinder("WireZ2", Vector3(1.7, 1.18, -0.15), Vector3(65, 0, 58), 0.015, 4.0, status_materials["safe"])


func _create_gas_cloud(store: Array[MeshInstance3D], origin: Vector3) -> void:
	var offsets := [
		Vector3(0, 0, 0),
		Vector3(0.28, 0.18, 0.08),
		Vector3(-0.22, 0.22, -0.12),
		Vector3(0.1, 0.42, -0.2),
		Vector3(-0.34, 0.05, 0.2),
		Vector3(0.38, 0.34, -0.08)
	]
	for index in range(offsets.size()):
		var sphere := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 0.12 + 0.02 * (index % 3)
		mesh.height = mesh.radius * 2.0
		sphere.mesh = mesh
		sphere.position = origin + offsets[index]
		sphere.material_override = status_materials["gas"]
		sphere.visible = false
		add_child(sphere)
		store.append(sphere)


func _set_gas_visible(nodes: Array[MeshInstance3D], visible: bool) -> void:
	for node in nodes:
		node.visible = visible
		if visible:
			node.position.y += sin(Time.get_ticks_msec() / 350.0 + node.position.x) * 0.002


func _material_for_level(level: String) -> Material:
	match level:
		"HIGH":
			return status_materials["critical"]
		"WARN", "WARNING":
			return status_materials["warning"]
		_:
			return status_materials["normal"]


func _material_for_state(state: String) -> Material:
	match state:
		"SYSTEM_FAULT":
			return status_materials["fault"]
		"SYSTEM_CRITICAL", "SYSTEM_SAFE_LATCHED":
			return status_materials["critical"]
		"SYSTEM_WARNING":
			return status_materials["warning"]
		"SYSTEM_NORMAL":
			return status_materials["normal"]
		_:
			return status_materials["safe"]


func _add_box(name: String, position: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.name = name
	node.mesh = mesh
	node.position = position
	node.material_override = material
	add_child(node)
	return node


func _add_cylinder(name: String, position: Vector3, rotation_deg: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 32
	node.name = name
	node.mesh = mesh
	node.position = position
	node.rotation_degrees = rotation_deg
	node.material_override = material
	add_child(node)
	return node


func _mat(color: Color, emission := 0.0, transparent := false) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.62
	if emission > 0.0:
		material.emission_enabled = true
		material.emission = color
		material.emission_energy_multiplier = emission
	if transparent:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.blend_mode = BaseMaterial3D.BLEND_MODE_MIX
		material.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return material
