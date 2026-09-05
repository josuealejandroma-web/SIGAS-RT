extends Node3D

@onready var twin: Node3D = $DigitalTwin
@onready var camera_rig: Node3D = $CameraRig
@onready var hud: CanvasLayer = $Hud

const TELEMETRY_PORT := 45701
const COMMAND_HOST := "127.0.0.1"
const COMMAND_PORT := 45702

var demo_time := 0.0
var demo_index := 0
var telemetry := PacketPeerUDP.new()
var command_peer := PacketPeerUDP.new()
var bridge_connected := false

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
	hud.view_requested.connect(_on_view_requested)
	var bind_result := telemetry.bind(TELEMETRY_PORT, "127.0.0.1")
	if bind_result == OK:
		hud.show_bridge_status("escuchando UDP " + str(TELEMETRY_PORT))
	else:
		hud.show_bridge_status("no se pudo abrir UDP " + str(TELEMETRY_PORT))
	command_peer.connect_to_host(COMMAND_HOST, COMMAND_PORT)
	_apply_frame(demo_frames[0])


func _process(delta: float) -> void:
	_poll_telemetry()
	if bridge_connected:
		return
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
	command_peer.put_packet(command.to_utf8_buffer())
	hud.show_bridge_status("comando enviado: " + command)


func _on_view_requested(view_name: String) -> void:
	if twin.has_method("set_technical_view"):
		twin.set_technical_view(view_name == "technical")
	if camera_rig.has_method("set_view"):
		camera_rig.set_view(view_name, twin)


func _poll_telemetry() -> void:
	while telemetry.get_available_packet_count() > 0:
		var packet := telemetry.get_packet()
		var text := packet.get_string_from_utf8()
		var parsed = JSON.parse_string(text)
		if typeof(parsed) == TYPE_DICTIONARY:
			bridge_connected = true
			_apply_frame(parsed)
			hud.show_bridge_status("telemetria activa")
