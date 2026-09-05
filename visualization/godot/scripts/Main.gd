extends Node3D

@onready var twin: Node3D = $DigitalTwin
@onready var hud: CanvasLayer = $Hud

var demo_time := 0.0
var demo_index := 0

var demo_frames := [
	{
		"type": "state",
		"state": "SYSTEM_STARTUP",
		"action": "SAFE_CLOSE",
		"zone1_adc": 410,
		"zone2_adc": 410,
		"zone1_level": "NORMAL",
		"zone2_level": "NORMAL",
		"valve": "CLOSED",
		"buzzer": false,
		"deadline_us": 500000,
		"response_us": 0,
		"result": "BOOT"
	},
	{
		"type": "state",
		"state": "SYSTEM_NORMAL",
		"action": "NORMAL",
		"zone1_adc": 420,
		"zone2_adc": 405,
		"zone1_level": "NORMAL",
		"zone2_level": "NORMAL",
		"valve": "OPEN",
		"buzzer": false,
		"deadline_us": 500000,
		"response_us": 0,
		"result": "PASS"
	},
	{
		"type": "state",
		"state": "SYSTEM_WARNING",
		"action": "ALARM_ONLY",
		"zone1_adc": 2850,
		"zone2_adc": 430,
		"zone1_level": "HIGH",
		"zone2_level": "NORMAL",
		"valve": "OPEN",
		"buzzer": true,
		"deadline_us": 500000,
		"response_us": 0,
		"result": "CANDIDATE"
	},
	{
		"type": "timing",
		"state": "SYSTEM_SAFE_LATCHED",
		"action": "SAFE_CLOSE",
		"zone1_adc": 3100,
		"zone2_adc": 450,
		"zone1_level": "HIGH",
		"zone2_level": "NORMAL",
		"valve": "CLOSED",
		"buzzer": true,
		"deadline_us": 500000,
		"response_us": 22502,
		"result": "PASS"
	}
]


func _ready() -> void:
	hud.scenario_requested.connect(_on_scenario_requested)
	_apply_frame(demo_frames[0])


func _process(delta: float) -> void:
	demo_time += delta
	if demo_time >= 2.0:
		demo_time = 0.0
		demo_index = (demo_index + 1) % demo_frames.size()
		_apply_frame(demo_frames[demo_index])


func apply_telemetry(frame: Dictionary) -> void:
	_apply_frame(frame)


func _apply_frame(frame: Dictionary) -> void:
	twin.apply_telemetry(frame)
	hud.apply_telemetry(frame)


func _on_scenario_requested(command: String) -> void:
	hud.show_bridge_status("Bridge no conectado: " + command)
