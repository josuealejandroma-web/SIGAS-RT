extends Node3D

@onready var twin: Node3D = $DigitalTwin
@onready var camera_rig: Node3D = $CameraRig
@onready var free_walk: CharacterBody3D = $FreeWalk
@onready var navigation: Node3D = $NavigationWorld
@onready var hud: CanvasLayer = $Hud
@onready var interactive_labels: CanvasLayer = $InteractiveLabels
@onready var presentation: CanvasLayer = $PresentationController

const TelemetryProtocol := preload("res://scripts/TelemetryProtocol.gd")
const TelemetrySession := preload("res://scripts/TelemetrySession.gd")
const RecordedReplay := preload("res://scripts/RecordedReplay.gd")

const TELEMETRY_PORT := 45701
const COMMAND_HOST := "127.0.0.1"
const COMMAND_PORT := 45702
const RECORDED_REPLAY_PATH := "res://data/wokwi_recorded_replay.jsonl"
const SOURCE_LIVE := 0
const SOURCE_RECORDED_REPLAY := 1
const SOURCE_SYNTHETIC_DEMO := 2
const SYNTHETIC_STEP_SECONDS := 2.0
const RECORDED_LOOP_DELAY_MS := 1000

var telemetry := PacketPeerUDP.new()
var command_peer := PacketPeerUDP.new()
var telemetry_session := TelemetrySession.new()
var recorded_replay := RecordedReplay.new()
var telemetry_bound := false
var source_mode := SOURCE_SYNTHETIC_DEMO
var local_playback_paused := false
var latest_frame: Dictionary = {}
var latest_timing_frame: Dictionary = {}
var synthetic_time := 0.0
var synthetic_index := 0
var recorded_time_ms := 0.0
var recorded_index := 0

var synthetic_frames := [
	{
		"type": "state", "seq": 1, "state": "SYSTEM_STARTUP", "action": "SAFE_CLOSE",
		"reason": "SYNTHETIC_BOOT", "zone1_adc": 410, "zone2_adc": 410,
		"zone1_level": "NORMAL", "zone2_level": "NORMAL", "reset": false,
		"valve": "CLOSED", "buzzer": true, "green_led": false, "red_led": true,
		"sample_us": 100000,
		"decision_us": 100060, "deadline_us": 500000
	},
	{
		"type": "state", "seq": 6, "state": "SYSTEM_NORMAL", "action": "NORMAL",
		"reason": "SYNTHETIC_NORMAL", "zone1_adc": 420, "zone2_adc": 405,
		"zone1_level": "NORMAL", "zone2_level": "NORMAL", "reset": false,
		"valve": "OPEN", "buzzer": false, "green_led": true, "red_led": false,
		"sample_us": 600000,
		"decision_us": 600060, "deadline_us": 500000
	},
	{
		"type": "state", "seq": 11, "state": "SYSTEM_WARNING", "action": "WARNING",
		"reason": "SYNTHETIC_WARNING", "zone1_adc": 2048, "zone2_adc": 430,
		"zone1_level": "WARNING", "zone2_level": "NORMAL", "reset": false,
		"valve": "OPEN", "buzzer": false, "green_led": true, "red_led": true,
		"sample_us": 1100000,
		"decision_us": 1100060, "deadline_us": 500000
	},
	{
		"type": "state", "seq": 14, "state": "SYSTEM_CRITICAL", "action": "SAFE_CLOSE",
		"reason": "SYNTHETIC_CRITICAL", "zone1_adc": 3420, "zone2_adc": 445,
		"zone1_level": "HIGH", "zone2_level": "NORMAL", "reset": false,
		"valve": "CLOSED", "buzzer": true, "green_led": false, "red_led": true,
		"sample_us": 1400000,
		"decision_us": 1400060, "deadline_us": 500000
	},
	{
		"type": "timing", "seq": 14, "t_critical_confirmed_us": 1400060,
		"t_actuator_received_us": 1422562, "response_us": 22502,
		"deadline_us": 500000, "result": "PASS"
	},
	{
		"type": "state", "seq": 16, "state": "SYSTEM_SAFE_LATCHED", "action": "SAFE_CLOSE",
		"reason": "SYNTHETIC_LATCHED", "zone1_adc": 3100, "zone2_adc": 450,
		"zone1_level": "HIGH", "zone2_level": "NORMAL", "reset": false,
		"valve": "CLOSED", "buzzer": true, "green_led": false, "red_led": true,
		"sample_us": 1600000,
		"decision_us": 1600060, "deadline_us": 500000
	}
]


func _ready() -> void:
	hud.scenario_requested.connect(_on_scenario_requested)
	hud.view_requested.connect(_on_view_requested)
	hud.source_requested.connect(_on_source_requested)
	navigation.build(twin, free_walk)
	interactive_labels.configure(twin, free_walk, self)
	presentation.configure(self, twin, free_walk, camera_rig, hud, navigation, interactive_labels)
	telemetry_bound = telemetry.bind(TELEMETRY_PORT, "127.0.0.1") == OK
	command_peer.connect_to_host(COMMAND_HOST, COMMAND_PORT)
	recorded_replay.load_file(RECORDED_REPLAY_PATH)
	start_synthetic_demo(false)
	_update_connection_display()


func _process(delta: float) -> void:
	_poll_telemetry()
	refresh_connection_state(Time.get_ticks_msec())
	if source_mode != SOURCE_LIVE and not local_playback_paused:
		_advance_local_playback(delta)


func apply_telemetry(raw_frame: Variant) -> bool:
	var frame := TelemetryProtocol.validate_payload(raw_frame)
	if frame.is_empty():
		return false
	_apply_validated_frame(frame)
	return true


func accept_live_payload(raw_frame: Variant, now_ms := -1) -> bool:
	var timestamp_ms := Time.get_ticks_msec() if now_ms < 0 else int(now_ms)
	var frame := telemetry_session.accept_payload(raw_frame, timestamp_ms)
	if frame.is_empty():
		return false
	if frame["type"] == "state":
		source_mode = SOURCE_LIVE
		local_playback_paused = false
	_apply_validated_frame(frame)
	_update_connection_display()
	return true


func refresh_connection_state(now_ms := -1) -> String:
	var timestamp_ms := Time.get_ticks_msec() if now_ms < 0 else int(now_ms)
	var previous_state: String = telemetry_session.get_connection_state()
	var current_state: String = telemetry_session.update_connection_state(timestamp_ms)
	if current_state != previous_state:
		_update_connection_display()
	return current_state


func _apply_validated_frame(frame: Dictionary) -> void:
	if frame["type"] == "state":
		latest_frame = frame.duplicate(true)
		twin.apply_telemetry(frame)
	else:
		latest_timing_frame = frame.duplicate(true)
	hud.apply_telemetry(frame)


func get_latest_frame() -> Dictionary:
	return latest_frame


func get_latest_timing_frame() -> Dictionary:
	return latest_timing_frame


func get_source_name() -> String:
	match source_mode:
		SOURCE_LIVE:
			return telemetry_session.get_connection_state()
		SOURCE_RECORDED_REPLAY:
			return "RECORDED REPLAY"
		_:
			return "SYNTHETIC DEMO"


func get_connection_state() -> String:
	return telemetry_session.get_connection_state()


func is_local_source() -> bool:
	return source_mode != SOURCE_LIVE


func start_synthetic_demo(show_status := true) -> bool:
	source_mode = SOURCE_SYNTHETIC_DEMO
	local_playback_paused = false
	synthetic_time = 0.0
	synthetic_index = 0
	hud.clear_timing()
	apply_telemetry(synthetic_frames[0])
	_update_connection_display()
	if show_status:
		hud.show_bridge_status("demo sintetica local")
	return true


func start_recorded_replay(show_status := true) -> bool:
	if recorded_replay.frames.is_empty() and not recorded_replay.load_file(RECORDED_REPLAY_PATH):
		hud.show_bridge_status("RECORDED REPLAY sin grabacion disponible")
		return false
	source_mode = SOURCE_RECORDED_REPLAY
	local_playback_paused = false
	recorded_time_ms = 0.0
	recorded_index = 0
	hud.clear_timing()
	_apply_recorded_frame(0)
	recorded_index = 1
	_update_connection_display()
	if show_status:
		hud.show_bridge_status("replay Wokwi grabado")
	return true


func toggle_local_playback() -> bool:
	if source_mode == SOURCE_LIVE:
		return false
	local_playback_paused = not local_playback_paused
	return local_playback_paused


func is_local_playback_paused() -> bool:
	return local_playback_paused


func advance_local_playback_for_test(delta: float) -> void:
	if source_mode != SOURCE_LIVE and not local_playback_paused:
		_advance_local_playback(delta)


func _advance_local_playback(delta: float) -> void:
	if source_mode == SOURCE_RECORDED_REPLAY:
		_advance_recorded_replay(delta)
	else:
		_advance_synthetic_demo(delta)


func _advance_synthetic_demo(delta: float) -> void:
	synthetic_time += delta
	while synthetic_time >= SYNTHETIC_STEP_SECONDS:
		synthetic_time -= SYNTHETIC_STEP_SECONDS
		synthetic_index = (synthetic_index + 1) % synthetic_frames.size()
		apply_telemetry(synthetic_frames[synthetic_index])


func _advance_recorded_replay(delta: float) -> void:
	var frames: Array[Dictionary] = recorded_replay.frames
	if frames.is_empty():
		return
	recorded_time_ms += delta * 1000.0
	while recorded_index < frames.size() and recorded_time_ms >= int(frames[recorded_index]["relative_ms"]):
		_apply_recorded_frame(recorded_index)
		recorded_index += 1
	var end_time := int(frames[frames.size() - 1]["relative_ms"]) + RECORDED_LOOP_DELAY_MS
	if recorded_index >= frames.size() and recorded_time_ms >= end_time:
		start_recorded_replay(false)


func _apply_recorded_frame(index: int) -> void:
	var frame: Dictionary = recorded_replay.frames[index]
	_apply_validated_frame(frame["payload"])


func _update_connection_display() -> void:
	var connection_state: String = telemetry_session.get_connection_state()
	hud.set_connection_state(connection_state)
	hud.set_source(get_source_name())
	if not telemetry_bound:
		hud.show_bridge_status("socket UDP no disponible / DISCONNECTED")
	elif connection_state == TelemetrySession.LIVE:
		hud.show_bridge_status("telemetria valida activa")
	elif connection_state == TelemetrySession.STALE:
		hud.show_bridge_status("telemetria sin actualizar")
	else:
		hud.show_bridge_status("esperando telemetria valida en UDP " + str(TELEMETRY_PORT))


func _on_scenario_requested(command: String) -> void:
	command_peer.put_packet(command.to_utf8_buffer())
	hud.show_bridge_status("comando enviado: " + command)


func _on_view_requested(view_name: String) -> void:
	presentation.show_orbit_view(view_name)


func _on_source_requested(source_name: String) -> void:
	if source_name == "RECORDED_REPLAY":
		start_recorded_replay()
	elif source_name == "SYNTHETIC_DEMO":
		start_synthetic_demo()


func _poll_telemetry() -> void:
	while telemetry.get_available_packet_count() > 0:
		var packet := telemetry.get_packet()
		var parser := JSON.new()
		if parser.parse(packet.get_string_from_utf8()) != OK or not accept_live_payload(parser.data):
			hud.show_bridge_status("paquete UDP invalido descartado")
