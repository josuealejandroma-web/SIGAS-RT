extends CharacterBody3D

signal speed_changed(speed_mps: float)
signal mouse_capture_changed(captured: bool)

const START_POSITION := Vector3(3.65, 0.16, 5.25)
const START_YAW := 0.0
const START_PITCH := -0.12
const MIN_SPEED := 1.4
const MAX_SPEED := 6.0

@export var eye_height := 1.70
@export var walk_speed := 3.0
@export var fast_multiplier := 2.0
@export var precision_multiplier := 0.35
@export var acceleration := 14.0
@export var deceleration := 18.0
@export var mouse_sensitivity := 0.0023
@export var min_pitch_degrees := -82.0
@export var max_pitch_degrees := 82.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D

var _active := false
var _yaw := START_YAW
var _pitch := 0.0
var _gravity := 9.8
var _debug_input_enabled := false
var _debug_move := Vector2.ZERO
var _debug_fast := false
var _debug_precision := false


func _ready() -> void:
	_gravity = float(ProjectSettings.get_setting("physics/3d/default_gravity", 9.8))
	head.position.y = eye_height
	floor_snap_length = 0.35
	floor_max_angle = deg_to_rad(52.0)
	reset_to_start()
	set_active(false, false)


func _physics_process(delta: float) -> void:
	if not _active:
		velocity = Vector3.ZERO
		return

	if not is_on_floor():
		velocity.y -= _gravity * delta
	else:
		velocity.y = -0.15

	var move_input := _read_move_input()
	var direction := transform.basis * Vector3(move_input.x, 0.0, move_input.y)
	direction.y = 0.0
	if direction.length_squared() > 1.0:
		direction = direction.normalized()

	var speed := walk_speed
	var fast := _debug_fast if _debug_input_enabled else Input.is_physical_key_pressed(KEY_SHIFT)
	var precision := _debug_precision if _debug_input_enabled else Input.is_physical_key_pressed(KEY_CTRL)
	if fast:
		speed *= fast_multiplier
	elif precision:
		speed *= precision_multiplier

	var target_x := direction.x * speed
	var target_z := direction.z * speed
	var rate := acceleration if direction.length_squared() > 0.0 else deceleration
	velocity.x = move_toward(velocity.x, target_x, rate * delta)
	velocity.z = move_toward(velocity.z, target_z, rate * delta)
	move_and_slide()

	if global_position.y < -0.75 or abs(global_position.x) > 9.0 or abs(global_position.z) > 7.0:
		reset_to_start()


func _unhandled_input(event: InputEvent) -> void:
	if not _active:
		return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		apply_look_delta(event.relative)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			adjust_speed(0.25)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			adjust_speed(-0.25)
		elif event.button_index == MOUSE_BUTTON_LEFT and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			capture_mouse()
	elif event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			release_mouse()
		else:
			capture_mouse()
		get_viewport().set_input_as_handled()


func set_active(enabled: bool, should_capture_mouse := true) -> void:
	_active = enabled
	camera.current = enabled
	if enabled and should_capture_mouse:
		capture_mouse()
	elif not enabled:
		release_mouse()


func is_active() -> bool:
	return _active


func capture_mouse() -> void:
	if DisplayServer.get_name() == "headless":
		return
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	mouse_capture_changed.emit(true)


func release_mouse() -> void:
	if DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	mouse_capture_changed.emit(false)


func apply_look_delta(relative: Vector2) -> void:
	_yaw -= relative.x * mouse_sensitivity
	_pitch -= relative.y * mouse_sensitivity
	_pitch = clamp(_pitch, deg_to_rad(min_pitch_degrees), deg_to_rad(max_pitch_degrees))
	rotation.y = _yaw
	head.rotation.x = _pitch


func set_view_angles(yaw_radians: float, pitch_radians := 0.0) -> void:
	_yaw = yaw_radians
	_pitch = clamp(pitch_radians, deg_to_rad(min_pitch_degrees), deg_to_rad(max_pitch_degrees))
	rotation.y = _yaw
	head.rotation.x = _pitch


func adjust_speed(delta_speed: float) -> void:
	walk_speed = clamp(walk_speed + delta_speed, MIN_SPEED, MAX_SPEED)
	speed_changed.emit(walk_speed)


func teleport_to_pose(safe_position: Vector3, yaw_radians := 0.0, pitch_radians := 0.0) -> void:
	global_position = safe_position
	velocity = Vector3.ZERO
	set_view_angles(yaw_radians, pitch_radians)


func reset_to_start() -> void:
	teleport_to_pose(START_POSITION, START_YAW, START_PITCH)


func get_camera() -> Camera3D:
	return camera


func get_eye_height() -> float:
	return eye_height


func get_walk_speed() -> float:
	return walk_speed


func set_debug_input(move_input: Vector2, fast := false, precision := false) -> void:
	_debug_input_enabled = true
	_debug_move = move_input.limit_length(1.0)
	_debug_fast = fast
	_debug_precision = precision


func clear_debug_input() -> void:
	_debug_input_enabled = false
	_debug_move = Vector2.ZERO
	_debug_fast = false
	_debug_precision = false


func _read_move_input() -> Vector2:
	if _debug_input_enabled:
		return _debug_move

	var result := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_A):
		result.x -= 1.0
	if Input.is_physical_key_pressed(KEY_D):
		result.x += 1.0
	if Input.is_physical_key_pressed(KEY_W):
		result.y -= 1.0
	if Input.is_physical_key_pressed(KEY_S):
		result.y += 1.0
	return result.limit_length(1.0)
