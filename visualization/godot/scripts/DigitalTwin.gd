extends Node3D

const HOUSE_SCENE_PATH := "res://models/sigas_house.glb"

const NORMAL_COLOR := Color(0.1, 0.62, 0.28)
const WARNING_COLOR := Color(0.95, 0.72, 0.1)
const CRITICAL_COLOR := Color(0.85, 0.08, 0.06)
const FAULT_COLOR := Color(0.55, 0.08, 0.08)
const SAFE_COLOR := Color(0.18, 0.42, 0.92)

var house: Node3D
var sensor_z1: MeshInstance3D
var sensor_z2: MeshInstance3D
var valve_body: MeshInstance3D
var valve_handle: MeshInstance3D
var led_green: MeshInstance3D
var led_red: MeshInstance3D
var buzzer: MeshInstance3D
var esp32: MeshInstance3D
var leak_z1: MeshInstance3D
var leak_z2: MeshInstance3D
var gas_z1: Array[MeshInstance3D] = []
var gas_z2: Array[MeshInstance3D] = []
var cutaway_nodes: Array[Node3D] = []
var status_materials := {}
var technical_view := false


func _ready() -> void:
	_create_materials()
	_load_blender_house()
	_bind_exported_nodes()
	_create_gas_clouds()
	set_technical_view(false)


func apply_telemetry(frame: Dictionary) -> void:
	var state := str(frame.get("state", "SYSTEM_STARTUP"))
	var zone1_level := str(frame.get("zone1_level", "NORMAL"))
	var zone2_level := str(frame.get("zone2_level", "NORMAL"))
	var valve := str(frame.get("valve", "CLOSED"))
	var buzzer_on := bool(frame.get("buzzer", false))

	_set_material(sensor_z1, _material_for_level(zone1_level))
	_set_material(sensor_z2, _material_for_level(zone2_level))
	_set_material(esp32, _material_for_state(state))
	_set_material(led_green, status_materials["green_on"] if state == "SYSTEM_NORMAL" else status_materials["green_off"])
	_set_material(led_red, status_materials["red_on"] if valve == "CLOSED" or state in ["SYSTEM_CRITICAL", "SYSTEM_SAFE_LATCHED", "SYSTEM_FAULT"] else status_materials["red_off"])
	_set_material(buzzer, status_materials["buzzer_on"] if buzzer_on else status_materials["buzzer_off"])

	var closed := valve == "CLOSED"
	_set_material(valve_body, status_materials["valve_closed"] if closed else status_materials["valve_open"])
	_set_material(valve_handle, status_materials["valve_closed"] if closed else status_materials["valve_open"])
	if valve_handle:
		valve_handle.rotation_degrees.y = 90.0 if closed else 0.0

	_set_gas_visible(gas_z1, zone1_level != "NORMAL")
	_set_gas_visible(gas_z2, zone2_level != "NORMAL")
	_set_node_visible(leak_z1, zone1_level != "NORMAL")
	_set_node_visible(leak_z2, zone2_level != "NORMAL")


func set_technical_view(enabled: bool) -> void:
	technical_view = enabled
	for node in cutaway_nodes:
		node.visible = not enabled
	if house:
		for node in _all_nodes(house):
			if node.name.contains("Helper") and node is MeshInstance3D:
				node.visible = false


func focus_position(name: String) -> Vector3:
	var node := _find_node(name)
	if node is Node3D:
		return node.global_position
	return Vector3.ZERO


func component_node(name: String) -> Node3D:
	var node := _find_node(name)
	if node is Node3D:
		return node
	return null


func component_position(name: String) -> Vector3:
	var node := component_node(name)
	return node.global_position if node else Vector3.ZERO


func is_technical_view() -> bool:
	return technical_view


func _load_blender_house() -> void:
	var packed := load(HOUSE_SCENE_PATH) as PackedScene
	if packed == null:
		push_error("No se pudo cargar el modelo Blender: " + HOUSE_SCENE_PATH)
		return
	house = packed.instantiate()
	house.name = "SIGAS_BlenderHouse"
	add_child(house)


func _bind_exported_nodes() -> void:
	sensor_z1 = _mesh("SIGAS_MQ2_Z1")
	sensor_z2 = _mesh("SIGAS_MQ2_Z2")
	valve_body = _mesh("SIGAS_AutoValve")
	valve_handle = _mesh("SIGAS_AutoValve_Handle")
	led_green = _mesh("SIGAS_LedGreen")
	led_red = _mesh("SIGAS_LedRed")
	buzzer = _mesh("SIGAS_Buzzer")
	esp32 = _mesh("SIGAS_ESP32")
	leak_z1 = _mesh("SIGAS_LeakPoint_Z1")
	leak_z2 = _mesh("SIGAS_LeakPoint_Z2")
	cutaway_nodes = []
	for node in _all_nodes(house):
		if node is Node3D and _hide_in_technical_view(str(node.name)):
			cutaway_nodes.append(node)
		if node is MeshInstance3D and node.name.contains("Helper"):
			node.material_override = status_materials["cutaway"]


func _hide_in_technical_view(node_name: String) -> bool:
	if node_name.contains("Wall") or node_name.contains("Roof"):
		return true
	for prefix in [
		"SIGAS_Upper_Slab",
		"SIGAS_Bedroom_",
		"SIGAS_Master",
		"SIGAS_Bathroom_2",
		"SIGAS_Upper_Bath_",
		"SIGAS_UpperHall",
		"SIGAS_Balcony",
		"SIGAS_Terrace_",
		"SIGAS_Dormer_",
		"SIGAS_Window_Bedroom_"
	]:
		if node_name.begins_with(prefix):
			return true
	return false


func _create_gas_clouds() -> void:
	_create_gas_cloud(gas_z1, _marker_position("Marker_Leak_Z1", Vector3(-3.55, 1.2, -2.55)))
	_create_gas_cloud(gas_z2, _marker_position("Marker_Leak_Z2", Vector3(3.45, 1.6, -3.05)))


func _create_gas_cloud(store: Array[MeshInstance3D], origin: Vector3) -> void:
	var offsets := [
		Vector3(0, 0, 0),
		Vector3(0.26, 0.18, 0.06),
		Vector3(-0.22, 0.24, -0.12),
		Vector3(0.1, 0.42, -0.18),
		Vector3(-0.34, 0.05, 0.18),
		Vector3(0.36, 0.34, -0.08)
	]
	for index in range(offsets.size()):
		var sphere := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 0.12 + 0.02 * (index % 3)
		mesh.height = mesh.radius * 2.0
		sphere.name = "Godot_GasCloud_Z" + str(1 if store == gas_z1 else 2) + "_" + str(index + 1)
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


func _set_node_visible(node: Node, visible: bool) -> void:
	if node:
		node.visible = visible


func _set_material(node: MeshInstance3D, material: Material) -> void:
	if node:
		node.material_override = material


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


func _mesh(name: String) -> MeshInstance3D:
	var node := _find_node(name)
	if node is MeshInstance3D:
		return node
	push_warning("Nodo Blender no encontrado o no es MeshInstance3D: " + name)
	return null


func _find_node(name: String) -> Node:
	if not house:
		return null
	for node in _all_nodes(house):
		if node.name == name:
			return node
	return null


func _marker_position(name: String, fallback: Vector3) -> Vector3:
	var node := _find_node(name)
	if node is Node3D:
		return node.global_position
	return fallback


func _all_nodes(root: Node) -> Array[Node]:
	var result: Array[Node] = []
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		result.append(current)
		for child in current.get_children():
			stack.append(child)
	return result


func _create_materials() -> void:
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
	status_materials["cutaway"] = _mat(Color(0.72, 0.82, 0.92, 0.24), 0.0, true)


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
