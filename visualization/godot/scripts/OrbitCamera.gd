extends Node3D

@export var orbit_speed := 0.01
@export var zoom_speed := 0.8
@export var min_distance := 6.0
@export var max_distance := 22.0

var yaw := 0.0
var pitch := -0.55
var distance := 13.0
var target := Vector3(0, 1.2, -0.8)
var dragging := false


func _ready() -> void:
	_update_camera()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			dragging = event.pressed
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			distance = max(min_distance, distance - zoom_speed)
			_update_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			distance = min(max_distance, distance + zoom_speed)
			_update_camera()
	if event is InputEventMouseMotion and dragging:
		yaw -= event.relative.x * orbit_speed
		pitch = clamp(pitch - event.relative.y * orbit_speed, -1.2, -0.12)
		_update_camera()
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_1:
				yaw = 0.0
				pitch = -0.55
				distance = 13.0
			KEY_2:
				yaw = -1.25
				pitch = -0.42
				distance = 10.0
			KEY_3:
				yaw = 1.25
				pitch = -0.42
				distance = 10.0
		_update_camera()


func _update_camera() -> void:
	var offset := Vector3(
		sin(yaw) * cos(pitch),
		-sin(pitch),
		cos(yaw) * cos(pitch)
	) * distance
	position = target + offset
	look_at(target, Vector3.UP)
