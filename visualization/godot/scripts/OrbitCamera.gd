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
				set_view("exterior")
			KEY_2:
				set_view("ground")
			KEY_3:
				set_view("upper")
			KEY_4:
				set_view("kitchen")
			KEY_5:
				set_view("technical")
			KEY_6:
				set_view("meter")
			KEY_7:
				set_view("control")
			KEY_8:
				set_view("cutaway")


func set_view(view_name: String, twin: Node = null) -> void:
	match view_name:
		"ground":
			yaw = -1.15
			pitch = -0.36
			distance = 8.8
			target = _focus(twin, "Floor_Ground_Helper", Vector3(-0.4, 1.35, -0.2))
		"upper":
			yaw = 1.0
			pitch = -0.38
			distance = 8.4
			target = _focus(twin, "CameraFocus_UpperFloor", Vector3(0.0, 4.2, 0.4))
		"kitchen":
			yaw = -0.72
			pitch = -0.22
			distance = 5.1
			target = _focus(twin, "CameraFocus_Kitchen", Vector3(-3.45, 1.3, -2.25))
		"technical":
			yaw = 0.9
			pitch = -0.3
			distance = 7.0
			target = _focus(twin, "CameraFocus_Cutaway", Vector3(0.0, 2.7, -0.35))
		"meter":
			yaw = -1.55
			pitch = -0.25
			distance = 4.8
			target = _focus(twin, "CameraFocus_MeterValve", Vector3(-4.7, 1.0, -3.05))
		"control":
			yaw = 2.2
			pitch = -0.18
			distance = 4.2
			target = _focus(twin, "CameraFocus_ControlPanel", Vector3(0.25, 1.45, 2.65))
		"cutaway":
			yaw = 0.55
			pitch = -0.92
			distance = 10.0
			target = _focus(twin, "Cutaway_Helper", Vector3(0.0, 3.15, 0.0))
		_:
			yaw = 0.0
			pitch = -0.55
			distance = 13.0
			target = _focus(twin, "CameraFocus_Exterior", Vector3(0, 1.2, -0.8))
	_update_camera()


func _focus(twin: Node, marker: String, fallback: Vector3) -> Vector3:
	if twin and twin.has_method("focus_position"):
		var position: Vector3 = twin.focus_position(marker)
		if position != Vector3.ZERO:
			return position
	return fallback


func _update_camera() -> void:
	var offset := Vector3(
		sin(yaw) * cos(pitch),
		-sin(pitch),
		cos(yaw) * cos(pitch)
	) * distance
	position = target + offset
	look_at(target, Vector3.UP)
