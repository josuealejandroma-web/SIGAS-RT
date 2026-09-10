extends SceneTree

const TelemetryProtocol := preload("res://scripts/TelemetryProtocol.gd")
const TelemetrySession := preload("res://scripts/TelemetrySession.gd")
const RecordedReplay := preload("res://scripts/RecordedReplay.gd")

var _failed := false


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	_test_connection_states()
	_test_timing_contract()
	_test_recorded_replay_loader()
	await _test_main_source_modes()
	if _failed:
		print("GODOT_TELEMETRY_SELF_TEST: FAIL")
		quit(1)
	else:
		print("GODOT_TELEMETRY_SELF_TEST: PASS")
		quit(0)


func _test_connection_states() -> void:
	var session := TelemetrySession.new()
	var valid := session.accept_payload(_valid_state_payload(), 1000)
	_check("A01-01", not valid.is_empty() and session.get_connection_state() == "LIVE", "payload valido no activo LIVE")

	var empty_session := TelemetrySession.new()
	var empty_result := empty_session.accept_payload({}, 1000)
	_check("A01-02", empty_result.is_empty() and empty_session.get_connection_state() == "DISCONNECTED", "objeto vacio activo LIVE")

	var aging_session := TelemetrySession.new()
	aging_session.accept_payload(_valid_state_payload(), 1000)
	_check("A01-03", aging_session.update_connection_state(2500) == "STALE", "no cambio a STALE en 1500 ms")
	_check("A01-04", aging_session.update_connection_state(4000) == "DISCONNECTED", "no cambio a DISCONNECTED en 3000 ms")

	aging_session.accept_payload(_valid_state_payload(), 4500)
	aging_session.update_connection_state(6000)
	var recovered_from_stale := aging_session.accept_payload(_valid_state_payload(), 6001)
	_check("A01-05", not recovered_from_stale.is_empty() and aging_session.get_connection_state() == "LIVE", "paquete valido no recupero STALE")

	aging_session.update_connection_state(9001)
	var recovered_from_disconnect := aging_session.accept_payload(_valid_state_payload(), 9002)
	_check("A01-06", not recovered_from_disconnect.is_empty() and aging_session.get_connection_state() == "LIVE", "paquete valido no recupero DISCONNECTED")


func _test_timing_contract() -> void:
	var pass_timing := _valid_timing_payload(1500000)
	var fail_timing := _valid_timing_payload(1500001)
	_check("A02-01-GODOT", TelemetryProtocol.validate_payload(pass_timing).get("result") == "PASS", "timing valido no produjo PASS")
	_check("A02-02-GODOT", TelemetryProtocol.validate_payload(fail_timing).get("result") == "FAIL", "timing sobre deadline no produjo FAIL")
	_check("A02-03-GODOT", TelemetryProtocol.validate_payload({"type": "timing"}).is_empty(), "timing incompleto fue aceptado")
	_check("A02-06-GODOT", TelemetryProtocol.validate_payload({"hello": "world"}).is_empty(), "JSON arbitrario fue aceptado")


func _test_recorded_replay_loader() -> void:
	var missing := RecordedReplay.new()
	var malformed := RecordedReplay.new()
	_check("A03-02-MISSING", not missing.load_file("res://data/not-present.jsonl"), "archivo inexistente fue aceptado")
	_check("A03-02-MALFORMED", not malformed.load_text("{not-json}"), "JSONL malformado fue aceptado")

	var replay := RecordedReplay.new()
	var loaded := replay.load_file("res://data/wokwi_recorded_replay.jsonl")
	var ordered := loaded and replay.frames.size() == 13
	var previous_time := -1
	for frame in replay.frames:
		ordered = ordered and int(frame["relative_ms"]) >= previous_time
		ordered = ordered and not TelemetryProtocol.validate_payload(frame["payload"]).is_empty()
		previous_time = int(frame["relative_ms"])
	_check(
		"A03-03",
		ordered and replay.get_source() == "simulation/wokwi-serial-visualization.log",
		"replay real no conservo payloads validos, orden o procedencia"
	)


func _test_main_source_modes() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var scene: Node = packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	_check("A03-01", scene.get_source_name() == "SYNTHETIC DEMO", "secuencia manual no se identifica como SYNTHETIC DEMO")
	var hud: CanvasLayer = scene.get_node("Hud")
	var hud_root: Control = hud.get_child(0)
	var full_panel: Control = hud_root.get_child(0)
	var viewport_height := float(ProjectSettings.get_setting("display/window/size/viewport_height", 720))
	_check(
		"A01-HUD-LAYOUT",
		full_panel.position.y + full_panel.size.y <= viewport_height - 28.0,
		"HUD completo invade el indicador inferior (bottom=%.1f viewport=%.1f)" % [full_panel.position.y + full_panel.size.y, viewport_height]
	)
	var invalid_timing_accepted: bool = scene.apply_telemetry({"type": "timing"})
	_check("A02-03-HUD", not invalid_timing_accepted and hud.get_timing_result() == "N/A", "timing invalido no permanecio en N/A")
	hud.set_connection_state("LIVE")
	var live_color: Color = hud.compact_labels["connection"].get_theme_color("font_color")
	hud.set_connection_state("STALE")
	var stale_color: Color = hud.compact_labels["connection"].get_theme_color("font_color")
	hud.set_connection_state("DISCONNECTED")
	var disconnected_color: Color = hud.compact_labels["connection"].get_theme_color("font_color")
	_check("A01-HUD", live_color != stale_color and stale_color != disconnected_color and live_color != disconnected_color, "HUD no distingue estados de conexion")
	var accepted_live: bool = scene.accept_live_payload(_valid_state_payload(), 1000)
	var state_before_expiry := str(scene.get_latest_frame().get("state"))
	var stale_state: String = scene.refresh_connection_state(2500)
	var state_while_stale := str(scene.get_latest_frame().get("state"))
	var disconnected_state: String = scene.refresh_connection_state(4000)
	var state_while_disconnected := str(scene.get_latest_frame().get("state"))
	_check(
		"A01-STATE-PRESERVED",
		accepted_live and stale_state == "STALE" and disconnected_state == "DISCONNECTED"
			and state_before_expiry == "SYSTEM_NORMAL" and state_while_stale == state_before_expiry
			and state_while_disconnected == state_before_expiry,
		"STALE o DISCONNECTED altero el SystemState recibido"
	)
	var replay_started: bool = scene.start_recorded_replay(false)
	var first_sequence := int(scene.get_latest_frame().get("seq", -1))
	scene.advance_local_playback_for_test(0.50)
	var second_sequence := int(scene.get_latest_frame().get("seq", -1))
	_check(
		"A03-03-MAIN",
		replay_started and scene.get_source_name() == "RECORDED REPLAY" and first_sequence == 1 and second_sequence == 6,
		"Main no reprodujo la captura real en orden"
	)
	scene.queue_free()


func _valid_state_payload() -> Dictionary:
	return {
		"type": "state",
		"seq": 7,
		"state": "SYSTEM_NORMAL",
		"action": "NORMAL",
		"reason": "SELF_TEST",
		"zone1_adc": 410,
		"zone2_adc": 420,
		"zone1_level": "NORMAL",
		"zone2_level": "NORMAL",
		"reset": false,
		"valve": "OPEN",
		"buzzer": false,
		"sample_us": 1500000,
		"decision_us": 1500063,
		"deadline_us": 500000
	}


func _valid_timing_payload(received_us: int) -> Dictionary:
	var response_us := received_us - 1000000
	return {
		"type": "timing",
		"seq": 9,
		"t_critical_confirmed_us": 1000000,
		"t_actuator_received_us": received_us,
		"response_us": response_us,
		"deadline_us": 500000,
		"result": "PASS" if response_us <= 500000 else "FAIL"
	}


func _check(test_name: String, condition: bool, failure_message: String) -> void:
	if condition:
		print(test_name + ": PASS")
	else:
		push_error(test_name + ": " + failure_message)
		_failed = true
