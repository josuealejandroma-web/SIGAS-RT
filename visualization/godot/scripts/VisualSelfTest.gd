extends SceneTree

const REQUIRED_PATHS := [
	"DigitalTwin",
	"DigitalTwin/SIGAS_BlenderHouse",
	"CameraRig",
	"CameraRig/Camera3D",
	"Hud"
]

const REQUIRED_NAMES := [
	"SIGAS_Garden",
	"SIGAS_Ground_Slab",
	"SIGAS_Upper_Slab",
	"SIGAS_FrontWall_Ground",
	"SIGAS_FrontWall_Upper",
	"SIGAS_Roof_Main",
	"SIGAS_Dormer_Left",
	"SIGAS_Dormer_Right",
	"SIGAS_Kitchen",
	"SIGAS_Stove",
	"SIGAS_TechnicalRoom",
	"SIGAS_WaterHeater",
	"SIGAS_Stairs",
	"SIGAS_Bedroom_1",
	"SIGAS_Bedroom_2",
	"SIGAS_Bathroom_2",
	"SIGAS_GasMeter",
	"SIGAS_MainValve",
	"SIGAS_AutoValve",
	"SIGAS_AutoValve_Handle",
	"SIGAS_MainPipe",
	"SIGAS_Pipe_Kitchen",
	"SIGAS_Pipe_Heater",
	"SIGAS_MQ2_Z1",
	"SIGAS_MQ2_Z2",
	"SIGAS_ESP32",
	"SIGAS_ControlPanel",
	"SIGAS_Buzzer",
	"SIGAS_LedGreen",
	"SIGAS_LedRed",
	"SIGAS_LeakPoint_Z1",
	"SIGAS_LeakPoint_Z2",
	"Marker_Leak_Z1",
	"Marker_Leak_Z2",
	"Marker_Valve",
	"Marker_Meter",
	"Marker_ESP32",
	"CameraFocus_Exterior",
	"CameraFocus_Kitchen",
	"CameraFocus_Technical",
	"CameraFocus_ControlPanel",
	"CameraFocus_UpperFloor",
	"Cutaway_Helper"
]


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	if packed == null:
		push_error("Main.tscn no carga")
		quit(1)
		return

	var scene: Node = packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame

	var failed := false
	for path in REQUIRED_PATHS:
		if scene.get_node_or_null(path) == null:
			push_error("Nodo faltante: " + path)
			failed = true

	for name in REQUIRED_NAMES:
		if _find_by_name(scene, name) == null:
			push_error("Nodo Blender faltante: " + name)
			failed = true

	var main = scene
	main.apply_telemetry({
		"type": "state",
		"state": "SYSTEM_SAFE_LATCHED",
		"action": "SAFE_CLOSE",
		"zone1_adc": 3686,
		"zone2_adc": 410,
		"zone1_level": "HIGH",
		"zone2_level": "NORMAL",
		"valve": "CLOSED",
		"buzzer": true,
		"deadline_us": 500000,
		"response_us": 22504,
		"result": "PASS"
	})
	await process_frame

	var twin = scene.get_node("DigitalTwin")
	var valve = _find_by_name(twin, "SIGAS_AutoValve")
	var gas = twin.gas_z1
	if valve == null or valve.material_override == null:
		push_error("Valvula Blender sin material despues de telemetria")
		failed = true
	if gas.is_empty() or not gas[0].visible:
		push_error("Gas de Zona 1 no visible con nivel HIGH")
		failed = true

	twin.set_technical_view(true)
	await process_frame
	var roof = _find_by_name(twin, "SIGAS_Roof_Main")
	if roof == null or roof.visible:
		push_error("Vista tecnica no oculto el techo principal")
		failed = true

	var camera_rig = scene.get_node("CameraRig")
	for view in ["exterior", "ground", "upper", "kitchen", "technical", "meter", "control", "cutaway"]:
		camera_rig.set_view(view, twin)
		await process_frame

	if failed:
		quit(1)
	else:
		print("GODOT_VISUAL_SELF_TEST: PASS")
		quit(0)


func _find_by_name(root_node: Node, node_name: String) -> Node:
	var stack: Array[Node] = [root_node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current.name == node_name:
			return current
		for child in current.get_children():
			stack.append(child)
	return null
