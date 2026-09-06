extends Node3D

signal portal_used(label: String)

const FLOOR_NAMES := [
	"SIGAS_Garden",
	"SIGAS_Ground_Slab",
	"SIGAS_Upper_Slab",
	"SIGAS_Balcony",
	"SIGAS_Terrace_Surface"
]

const OBSTACLE_PREFIXES := [
	"SIGAS_Kitchen",
	"SIGAS_Service_Counter",
	"SIGAS_WaterHeater",
	"SIGAS_GuestBath_",
	"SIGAS_Living_",
	"SIGAS_Dining_",
	"SIGAS_MasterBed",
	"SIGAS_Master_Nightstand",
	"SIGAS_Bedroom_2_Bed",
	"SIGAS_Bedroom_2_Desk",
	"SIGAS_Bedroom_3_Bed",
	"SIGAS_Bedroom_3_Desk",
	"SIGAS_Upper_Bath_",
	"SIGAS_GasMeter",
	"SIGAS_MainValve",
	"SIGAS_AutoValve_ActuatorBox",
	"SIGAS_Balcony_Rail_"
]

var _player: CharacterBody3D
var _static_body: StaticBody3D
var _built := false
var _collision_count := 0
var _portal_targets := {}
var _portal_cooldown_until := 0


func build(twin: Node3D, player: CharacterBody3D) -> void:
	if _built:
		return
	_player = player
	_static_body = StaticBody3D.new()
	_static_body.name = "SIGAS_StaticNavigation"
	_static_body.collision_layer = 1
	_static_body.collision_mask = 0
	add_child(_static_body)

	var house: Node = twin.get("house")
	if house:
		for node in _all_nodes(house):
			if node is MeshInstance3D and _needs_box_collider(str(node.name)):
				_add_mesh_box(node)

	_add_stair_ramp()
	_add_scene_boundaries()
	_add_balcony_boundaries()
	_add_safe_portals()
	_built = true


func is_built() -> bool:
	return _built


func get_collision_count() -> int:
	return _collision_count


func get_portal_count() -> int:
	return _portal_targets.size()


func get_portal_names() -> Array:
	return _portal_targets.keys()


func activate_portal_for_test(portal_name: String) -> bool:
	if not _portal_targets.has(portal_name) or not _player:
		return false
	var target: Dictionary = _portal_targets[portal_name]
	_player.teleport_to_pose(target["position"], target["yaw"])
	return true


func _needs_box_collider(node_name: String) -> bool:
	if node_name.contains("Helper") or node_name.begins_with("SIGAS_Stairs"):
		return false
	if node_name.contains("Wall"):
		return true
	if node_name == "SIGAS_Bedroom_Divider":
		return true
	if node_name in FLOOR_NAMES:
		return true
	for prefix in OBSTACLE_PREFIXES:
		if node_name.begins_with(prefix):
			return true
	return false


func _add_mesh_box(mesh_instance: MeshInstance3D) -> void:
	var world_box: AABB = mesh_instance.global_transform * mesh_instance.get_aabb()
	if world_box.size.x < 0.01 or world_box.size.y < 0.01 or world_box.size.z < 0.01:
		return
	_add_box_shape("Collider_" + str(mesh_instance.name), world_box.get_center(), world_box.size)


func _add_box_shape(shape_name: String, center: Vector3, size: Vector3) -> void:
	var shape := BoxShape3D.new()
	shape.size = size
	var collision := CollisionShape3D.new()
	collision.name = shape_name
	collision.position = center
	collision.shape = shape
	_static_body.add_child(collision)
	_collision_count += 1


func _add_stair_ramp() -> void:
	var ramp := ConvexPolygonShape3D.new()
	ramp.points = PackedVector3Array([
		Vector3(0.13, 0.10, -1.18),
		Vector3(1.37, 0.10, -1.18),
		Vector3(0.13, 0.10, 1.55),
		Vector3(1.37, 0.10, 1.55),
		Vector3(0.13, 1.90, 1.55),
		Vector3(1.37, 1.90, 1.55)
	])
	var collision := CollisionShape3D.new()
	collision.name = "Collider_SIGAS_StairRamp"
	collision.shape = ramp
	_static_body.add_child(collision)
	_collision_count += 1


func _add_scene_boundaries() -> void:
	_add_box_shape("Boundary_North", Vector3(0.0, 3.5, -5.85), Vector3(15.8, 7.0, 0.18))
	_add_box_shape("Boundary_South", Vector3(0.0, 3.5, 5.85), Vector3(15.8, 7.0, 0.18))
	_add_box_shape("Boundary_West", Vector3(-7.85, 3.5, 0.0), Vector3(0.18, 7.0, 11.7))
	_add_box_shape("Boundary_East", Vector3(7.85, 3.5, 0.0), Vector3(0.18, 7.0, 11.7))


func _add_balcony_boundaries() -> void:
	_add_box_shape("Boundary_Balcony_Left", Vector3(-2.12, 4.45, 4.25), Vector3(0.16, 1.8, 1.35))
	_add_box_shape("Boundary_Balcony_Right", Vector3(2.12, 4.45, 4.25), Vector3(0.16, 1.8, 1.35))
	_add_box_shape("Boundary_Balcony_Front", Vector3(0.0, 4.45, 4.88), Vector3(4.4, 1.8, 0.14))


func _add_safe_portals() -> void:
	_add_portal_pair(
		"entry_in", Vector3(3.65, 1.0, 4.05), Vector3(1.05, 1.9, 0.34), Vector3(3.65, 0.18, 2.75), 0.0,
		"entry_out", Vector3(3.65, 1.0, 3.16), Vector3(1.05, 1.9, 0.30), Vector3(3.65, 0.16, 4.45), PI
	)
	_add_portal_pair(
		"technical_in", Vector3(1.34, 1.0, -1.45), Vector3(0.28, 1.9, 1.0), Vector3(2.20, 0.18, -1.45), -PI / 2.0,
		"technical_out", Vector3(2.06, 1.0, -1.45), Vector3(0.28, 1.9, 1.0), Vector3(1.02, 0.18, -1.45), PI / 2.0
	)
	_add_portal(
		"stairs_up", Vector3(0.75, 2.35, 0.35), Vector3(1.15, 1.1, 0.45),
		Vector3(1.02, 3.32, 0.12), 0.0
	)
	_add_portal(
		"stairs_down", Vector3(0.95, 4.08, 1.02), Vector3(1.15, 1.55, 0.42),
		Vector3(0.75, 0.18, -1.32), PI
	)
	_add_portal_pair(
		"master_in", Vector3(0.48, 4.08, -1.70), Vector3(0.28, 1.65, 0.95), Vector3(-0.42, 3.32, -1.70), PI / 2.0,
		"master_out", Vector3(-0.08, 4.08, -1.70), Vector3(0.28, 1.65, 0.95), Vector3(0.82, 3.32, -1.70), -PI / 2.0
	)
	_add_portal_pair(
		"bedroom2_in", Vector3(0.48, 4.08, 2.05), Vector3(0.28, 1.65, 0.9), Vector3(-0.42, 3.32, 2.05), PI / 2.0,
		"bedroom2_out", Vector3(-0.08, 4.08, 2.05), Vector3(0.28, 1.65, 0.9), Vector3(0.82, 3.32, 2.05), -PI / 2.0
	)
	_add_portal_pair(
		"upper_bath_in", Vector3(2.24, 4.08, -1.80), Vector3(0.28, 1.65, 0.9), Vector3(3.02, 3.32, -1.80), -PI / 2.0,
		"upper_bath_out", Vector3(2.94, 4.08, -1.80), Vector3(0.28, 1.65, 0.9), Vector3(2.10, 3.32, -1.80), PI / 2.0
	)
	_add_portal_pair(
		"balcony_out", Vector3(0.90, 4.08, 3.24), Vector3(0.9, 1.65, 0.28), Vector3(0.90, 3.75, 4.12), PI,
		"balcony_in", Vector3(0.90, 4.55, 3.96), Vector3(0.9, 1.65, 0.28), Vector3(0.90, 3.32, 2.95), 0.0
	)


func _add_portal_pair(
	name_a: String,
	center_a: Vector3,
	size_a: Vector3,
	target_a: Vector3,
	yaw_a: float,
	name_b: String,
	center_b: Vector3,
	size_b: Vector3,
	target_b: Vector3,
	yaw_b: float
) -> void:
	_add_portal(name_a, center_a, size_a, target_a, yaw_a)
	_add_portal(name_b, center_b, size_b, target_b, yaw_b)


func _add_portal(
	portal_name: String,
	center: Vector3,
	size: Vector3,
	target_position: Vector3,
	target_yaw: float
) -> void:
	var area := Area3D.new()
	area.name = "Portal_" + portal_name
	area.position = center
	area.collision_layer = 4
	area.collision_mask = 2
	area.monitoring = true
	area.monitorable = false
	var shape := BoxShape3D.new()
	shape.size = size
	var collision := CollisionShape3D.new()
	collision.shape = shape
	area.add_child(collision)
	add_child(area)
	area.body_entered.connect(_on_portal_entered.bind(portal_name, target_position, target_yaw))
	_portal_targets[portal_name] = {"position": target_position, "yaw": target_yaw}


func _on_portal_entered(
	body: Node3D,
	portal_name: String,
	target_position: Vector3,
	target_yaw: float
) -> void:
	if body != _player or Time.get_ticks_msec() < _portal_cooldown_until:
		return
	_portal_cooldown_until = Time.get_ticks_msec() + 900
	_player.call_deferred("teleport_to_pose", target_position, target_yaw)
	portal_used.emit(portal_name)


func _all_nodes(root: Node) -> Array[Node]:
	var result: Array[Node] = []
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		result.append(current)
		for child in current.get_children():
			stack.append(child)
	return result
