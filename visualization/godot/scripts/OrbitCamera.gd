extends Node3D

const TOUR_VIEWS := ["exterior", "ground", "kitchen", "control", "meter", "upper", "cutaway"]

@export var orbit_speed := 0.01
@export var zoom_speed := 0.8
@export var min_distance := 6.0
@export var max_distance := 22.0

var yaw := 0.0
var pitch := -0.55
var distance := 13.0
var target := Vector3(0, 1.2, -0.8)
var dragging := false
var active := true
var auto_tour := false
var tour_interval := 4.0
var tour_elapsed := 0.0
var tour_index := 0
var tour_twin: Node

@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	_update_camera()


func _process(delta: float) -> void:
	if not active or not auto_tour:
		return
	tour_elapsed += delta
	if tour_elapsed >= tour_interval:
		tour_elapsed = 0.0
		tour_index = (tour_index + 1) % TOUR_VIEWS.size()
		set_view(TOUR_VIEWS[tour_index], tour_twin)


func _unhandled_input(event: InputEvent) -> void:
	if not active:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			dragging = event.pressed
			if dragging:
				stop_auto_tour()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			stop_auto_tour()
			distance = max(min_distance, distance - zoom_speed)
			_update_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			stop_auto_tour()
			distance = min(max_distance, distance + zoom_speed)
			_update_camera()
	if event is InputEventMouseMotion and dragging:
		yaw -= event.relative.x * orbit_speed
		pitch = clamp(pitch - event.relative.y * orbit_speed, -1.2, -0.12)
		_update_camera()


func set_active(enabled: bool) -> void:
	active = enabled
	camera.current = enabled
	if not enabled:
		dragging = false
		stop_auto_tour()


func start_auto_tour(twin: Node) -> void:
	tour_twin = twin
	tour_index = 0
	tour_elapsed = 0.0
	auto_tour = true
	set_view(TOUR_VIEWS[tour_index], tour_twin)


func stop_auto_tour() -> void:
	auto_tour = false


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
			pitch = -0.28
			distance = 10.5
			target = Vector3(0.0, 2.5, 0.1)
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
