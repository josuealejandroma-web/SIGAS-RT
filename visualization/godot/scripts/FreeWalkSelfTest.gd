extends SceneTree

var _failed := false

const QUICK_EXIT_DIRECTIONS := [
	Vector2(0.0, -1.0),
	Vector2(1.0, 0.0),
	Vector2(0.0, 1.0),
	Vector2(-1.0, 0.0)
]
const FLOOR_COLLIDERS := [
	"Collider_SIGAS_Garden",
	"Collider_SIGAS_Ground_Slab",
	"Collider_SIGAS_Upper_Slab",
	"Collider_SIGAS_Balcony",
	"Collider_SIGAS_Terrace_Surface",
	"Collider_SIGAS_StairRamp"
]


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	if packed == null:
		push_error("FREE-00: Main.tscn no carga")
		quit(1)
		return

	var scene: Node = packed.instantiate()
	root.add_child(scene)
	await process_frame
	await _wait_physics(4)

	var free_walk: CharacterBody3D = scene.get_node("FreeWalk")
	var navigation: Node3D = scene.get_node("NavigationWorld")
	var presentation: CanvasLayer = scene.get_node("PresentationController")
	var labels: CanvasLayer = scene.get_node("InteractiveLabels")
	var hud: CanvasLayer = scene.get_node("Hud")
	var twin: Node3D = scene.get_node("DigitalTwin")

	_check(
		"FREE-01",
		presentation.is_free_mode() and free_walk.is_active() and free_walk.get_camera().current and abs(free_walk.get_eye_height() - 1.70) < 0.01,
		"Godot no inicio en modo libre con camara humana"
	)

	free_walk.teleport_to_pose(Vector3(0.0, 0.18, 5.05), 0.0)
	await _wait_physics(4)
	var movement_start := free_walk.global_position
	free_walk.set_debug_input(Vector2(1.0, 0.0))
	await _wait_physics(20)
	free_walk.clear_debug_input()
	_check("FREE-02", free_walk.global_position.distance_to(movement_start) > 0.12, "WASD no produjo desplazamiento")
	var speed_before: float = free_walk.get_walk_speed()
	free_walk.adjust_speed(0.25)
	var speed_changed: bool = free_walk.get_walk_speed() > speed_before
	free_walk.adjust_speed(-0.25)
	_check("FREE-02-SPEED", speed_changed, "La rueda no ajusta la velocidad base")

	var yaw_before := free_walk.rotation.y
	var pitch_before: float = free_walk.get_node("Head").rotation.x
	free_walk.apply_look_delta(Vector2(80.0, -35.0))
	_check(
		"FREE-03",
		abs(free_walk.rotation.y - yaw_before) > 0.05 and abs(free_walk.get_node("Head").rotation.x - pitch_before) > 0.02,
		"El mouse no cambio yaw y pitch"
	)

	free_walk.teleport_to_pose(Vector3(0.0, 0.18, 4.55), 0.0)
	await _wait_physics(4)
	free_walk.set_debug_input(Vector2(0.0, -1.0), true)
	await _wait_physics(75)
	free_walk.clear_debug_input()
	_check(
		"FREE-04",
		navigation.is_built() and navigation.get_collision_count() >= 25 and free_walk.global_position.z > 3.80,
		"El jugador atraveso la pared exterior o faltan colliders"
	)
	free_walk.teleport_to_pose(Vector3(3.65, 0.16, 4.55), 0.0)
	free_walk.set_debug_input(Vector2(0.0, -1.0))
	await _wait_physics(26)
	free_walk.clear_debug_input()
	_check("FREE-04-ENTRY", free_walk.global_position.z < 3.30, "La entrada segura no atraviesa la puerta principal")

	free_walk.teleport_to_pose(Vector3(0.0, 1.8, 5.0), 0.0)
	await _wait_physics(90)
	_check("FREE-05", free_walk.global_position.y >= -0.01, "El jugador cayo bajo el suelo")

	free_walk.teleport_to_pose(Vector3(-3.35, 0.18, -1.22), 0.0)
	free_walk.set_debug_input(Vector2(0.0, -1.0), true)
	await _wait_physics(50)
	free_walk.clear_debug_input()
	_check("FREE-05-FURNITURE", free_walk.global_position.z > -1.58, "El jugador atraveso el mueble principal de cocina")

	presentation.trigger_quick_zone(3)
	await _wait_physics(3)
	var kitchen_start := free_walk.global_position
	free_walk.set_debug_input(Vector2(0.0, 1.0), false, true)
	await _wait_physics(15)
	free_walk.clear_debug_input()
	_check(
		"FREE-06",
		kitchen_start.x < -1.7 and kitchen_start.z < -1.0 and free_walk.global_position.distance_to(kitchen_start) > 0.03,
		"La posicion segura de cocina no permite recorrido"
	)

	free_walk.teleport_to_pose(Vector3(1.00, 0.18, -1.45), -PI / 2.0)
	free_walk.set_debug_input(Vector2(0.0, -1.0))
	await _wait_physics(35)
	free_walk.clear_debug_input()
	_check(
		"FREE-07",
		free_walk.global_position.x > 2.0 and free_walk.global_position.z < -0.7,
		"El area tecnica no es accesible"
	)

	free_walk.teleport_to_pose(Vector3(0.75, 0.18, -1.42), PI)
	free_walk.set_debug_input(Vector2(0.0, -1.0), true)
	await _wait_physics(110)
	free_walk.clear_debug_input()
	_check(
		"FREE-08",
		navigation.get_portal_count() >= 14 and free_walk.global_position.y > 3.0,
		"La transicion segura de escalera no llega a planta alta"
	)

	var quick_zones_ok := true
	var quick_geometry_ok := true
	for index in range(1, 10):
		var pose: Dictionary = presentation.get_quick_pose(index)
		var triggered: bool = presentation.trigger_quick_zone(index)
		var reached_pose: bool = triggered and free_walk.global_position.distance_to(pose["position"]) < 0.02
		quick_zones_ok = quick_zones_ok and reached_pose
		var blocking_overlaps := _blocking_overlap_names(free_walk)
		var clear: bool = blocking_overlaps.is_empty()
		_check(
			"M07-QUICK-%d-CLEAR" % index,
			clear,
			"La capsula intersecta: " + ", ".join(blocking_overlaps)
		)
		var floor_ok := _has_floor_support(free_walk, float(pose["position"].y))
		_check("M07-QUICK-%d-FLOOR" % index, floor_ok, "El acceso no apoya en el piso esperado")
		var can_exit: bool = await _can_exit_quick_pose(presentation, free_walk, index, pose)
		_check("M07-QUICK-%d-EXIT" % index, can_exit, "El jugador no puede salir de la posicion")
		quick_geometry_ok = quick_geometry_ok and clear and floor_ok and can_exit
	_check("FREE-09", quick_zones_ok, "Uno o mas accesos 1-9 no llevaron a su posicion segura")
	_check("M07-QUICK-ALL", quick_geometry_ok, "Uno o mas accesos rapidos no son geometricamente seguros")

	presentation.switch_mode(2, false)
	var general_technical: bool = twin.is_technical_view() and scene.get_node("CameraRig/Camera3D").current
	presentation.trigger_quick_zone(2)
	presentation.toggle_technical_view()
	var technical_on: bool = twin.is_technical_view() and presentation.is_free_mode()
	presentation.toggle_technical_view()
	_check("FREE-10", general_technical and technical_on and not twin.is_technical_view(), "T o la vista tecnica general no alternaron correctamente")

	hud.set_display_mode(hud.DISPLAY_FULL)
	var hud_cycle_ok: bool = hud.cycle_display_mode() == hud.DISPLAY_COMPACT
	hud_cycle_ok = hud_cycle_ok and hud.cycle_display_mode() == hud.DISPLAY_HIDDEN
	hud_cycle_ok = hud_cycle_ok and hud.cycle_display_mode() == hud.DISPLAY_FULL
	_check("FREE-11", hud_cycle_ok, "H no recorre los tres estados del HUD")

	presentation.toggle_help(true)
	var help_opened: bool = presentation.is_help_visible()
	presentation.toggle_help(false)
	_check("FREE-12", help_opened and not presentation.is_help_visible(), "F1 no alterna la ayuda")

	free_walk.teleport_to_pose(Vector3(-4.0, 3.32, -2.0), 1.0)
	presentation.reset_free_camera()
	var start_pose: Dictionary = presentation.get_quick_pose(1)
	_check("FREE-13", free_walk.global_position.distance_to(start_pose["position"]) < 0.02, "R no restablece la camara")
	presentation.toggle_presentation_mode()
	var presentation_enabled: bool = presentation.is_presentation_mode() and hud.get_display_mode() == hud.DISPLAY_COMPACT
	presentation.toggle_presentation_mode()
	_check("FREE-13-PRESENTATION", presentation_enabled and hud.get_display_mode() == hud.DISPLAY_FULL, "F5 no alterna Presentation Mode")

	scene.start_synthetic_demo(false)
	scene.local_playback_paused = false
	scene.synthetic_index = 0
	scene.synthetic_time = 1.99
	free_walk.set_debug_input(Vector2(1.0, 0.0))
	var demo_walk_start := free_walk.global_position
	scene.advance_local_playback_for_test(0.02)
	await _wait_physics(12)
	free_walk.clear_debug_input()
	_check(
		"FREE-14",
		scene.synthetic_index == 1 and free_walk.get_camera().current and free_walk.global_position.distance_to(demo_walk_start) > 0.02,
		"La demo sintetica no continuo mientras el jugador caminaba"
	)
	var paused_once: bool = scene.toggle_local_playback()
	var resumed_once: bool = not scene.toggle_local_playback()
	_check("FREE-14-PAUSE", paused_once and resumed_once, "Space/P no pausa y reanuda la fuente local")

	scene.apply_telemetry({
		"type": "state",
		"seq": 40,
		"state": "SYSTEM_SAFE_LATCHED",
		"action": "SAFE_CLOSE",
		"reason": "SELF_TEST",
		"zone1_adc": 3686,
		"zone2_adc": 3900,
		"zone1_level": "HIGH",
		"zone2_level": "HIGH",
		"reset": false,
		"valve": "CLOSED",
		"buzzer": true,
		"green_led": false,
		"red_led": true,
		"sample_us": 5000000,
		"decision_us": 5000060,
		"deadline_us": 500000
	})
	await process_frame
	_check(
		"FREE-15",
		twin.valve_body.material_override != null and abs(twin.valve_handle.rotation_degrees.y - 90.0) < 0.1,
		"La valvula no reflejo CLOSED"
	)
	_check(
		"FREE-16",
		twin.sensor_z1.material_override != null and twin.sensor_z2.material_override != null and twin.gas_z1[0].visible and twin.gas_z2[0].visible,
		"Z1/Z2 o sus fugas no reflejaron telemetria"
	)
	_check(
		"FREE-17",
		labels.get_candidate_count() == 14 and scene.get_node_or_null("CameraRig/Camera3D") != null,
		"La integracion visual previa quedo incompleta"
	)
	print(
		"FREE_WALK_NAVIGATION: colliders=%d portals=%d labels=%d" % [
			navigation.get_collision_count(),
			navigation.get_portal_count(),
			labels.get_candidate_count()
		]
	)

	if _failed:
		print("GODOT_FREE_WALK_SELF_TEST: FAIL")
		quit(1)
	else:
		print("GODOT_FREE_WALK_SELF_TEST: PASS")
		quit(0)


func _wait_physics(frame_count: int) -> void:
	for _index in range(frame_count):
		await physics_frame


func _blocking_overlap_names(free_walk: CharacterBody3D) -> PackedStringArray:
	var collision_shape: CollisionShape3D = free_walk.get_node("CollisionShape3D")
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = collision_shape.shape
	query.transform = collision_shape.global_transform
	query.collision_mask = 1
	query.collide_with_bodies = true
	query.collide_with_areas = false
	query.exclude = [free_walk.get_rid()]
	var blocking := PackedStringArray()
	for result in free_walk.get_world_3d().direct_space_state.intersect_shape(query, 128):
		var shape_name := _result_shape_name(result)
		if not shape_name.is_empty() and shape_name not in FLOOR_COLLIDERS and shape_name not in blocking:
			blocking.append(shape_name)
	return blocking


func _has_floor_support(free_walk: CharacterBody3D, expected_y: float) -> bool:
	if abs(free_walk.global_position.y - expected_y) > 0.03:
		return false
	var query := PhysicsRayQueryParameters3D.create(
		free_walk.global_position + Vector3.UP * 0.12,
		free_walk.global_position + Vector3.DOWN * 0.35,
		1,
		[free_walk.get_rid()]
	)
	query.collide_with_areas = false
	var result := free_walk.get_world_3d().direct_space_state.intersect_ray(query)
	return not result.is_empty() and _result_shape_name(result) in FLOOR_COLLIDERS


func _can_exit_quick_pose(
	presentation: CanvasLayer,
	free_walk: CharacterBody3D,
	index: int,
	pose: Dictionary
) -> bool:
	for direction in QUICK_EXIT_DIRECTIONS:
		presentation.trigger_quick_zone(index)
		await _wait_physics(2)
		var start := free_walk.global_position
		free_walk.set_debug_input(direction, false, true)
		await _wait_physics(10)
		free_walk.clear_debug_input()
		var horizontal_delta := free_walk.global_position - start
		horizontal_delta.y = 0.0
		if horizontal_delta.length() > 0.05 and abs(free_walk.global_position.y - float(pose["position"].y)) < 0.40:
			return true
	return false


func _result_shape_name(result: Dictionary) -> String:
	var collider: Variant = result.get("collider")
	var shape_index := int(result.get("shape", -1))
	if not collider is CollisionObject3D or shape_index < 0:
		return ""
	var owner_id: int = collider.shape_find_owner(shape_index)
	if owner_id < 0:
		return ""
	var owner: Object = collider.shape_owner_get_owner(owner_id)
	return str(owner.name) if owner is Node else ""


func _check(test_name: String, condition: bool, failure_message: String) -> void:
	if condition:
		print(test_name + ": PASS")
	else:
		push_error(test_name + ": " + failure_message)
		_failed = true
