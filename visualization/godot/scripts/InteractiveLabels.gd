extends CanvasLayer

const COMPONENTS := [
	{"node": "SIGAS_MQ2_Z1", "title": "MQ-2 ZONA 1 - COCINA", "kind": "z1"},
	{"node": "SIGAS_MQ2_Z2", "title": "MQ-2 ZONA 2 - CALEFON", "kind": "z2"},
	{"node": "SIGAS_ESP32", "title": "ESP32 - PANEL SIGAS", "kind": "esp32"},
	{"node": "SIGAS_Buzzer", "title": "BUZZER", "kind": "buzzer"},
	{"node": "SIGAS_LedGreen", "title": "LED VERDE", "kind": "led_green"},
	{"node": "SIGAS_LedRed", "title": "LED ROJO", "kind": "led_red"},
	{"node": "SIGAS_GasMeter", "title": "MEDIDOR DE GAS", "kind": "meter"},
	{"node": "SIGAS_MainValve", "title": "VALVULA PRINCIPAL", "kind": "main_valve"},
	{"node": "SIGAS_AutoValve", "title": "VALVULA AUTOMATICA SIGAS-RT", "kind": "auto_valve"},
	{"node": "SIGAS_MainPipe", "title": "TUBERIA PRINCIPAL", "kind": "pipe"},
	{"node": "SIGAS_Pipe_Kitchen", "title": "RAMAL COCINA", "kind": "pipe"},
	{"node": "SIGAS_Pipe_Heater", "title": "RAMAL CALEFON", "kind": "pipe"},
	{"node": "SIGAS_WaterHeater", "title": "CALEFON", "kind": "heater"},
	{"node": "SIGAS_Stove", "title": "COCINA", "kind": "stove"}
]

@export var detection_distance := 3.2
@export var refresh_interval := 0.12

var _twin: Node3D
var _player: CharacterBody3D
var _main: Node
var _panel: PanelContainer
var _label: Label
var _candidates: Array = []
var _elapsed := 0.0
var _active := false
var _current_component := ""


func _ready() -> void:
	layer = 18
	_build_interface()
	set_process(true)


func configure(twin: Node3D, player: CharacterBody3D, main: Node) -> void:
	_twin = twin
	_player = player
	_main = main
	_candidates.clear()
	for definition in COMPONENTS:
		var node: Node3D = twin.component_node(definition["node"])
		if node:
			_candidates.append({"definition": definition, "node": node})
	_refresh_label()


func _process(delta: float) -> void:
	if not _active:
		return
	_elapsed += delta
	if _elapsed >= refresh_interval:
		_elapsed = 0.0
		_refresh_label()


func set_active(enabled: bool) -> void:
	_active = enabled
	if not enabled:
		_current_component = ""
		_panel.visible = false
	else:
		_refresh_label()


func is_active() -> bool:
	return _active


func get_candidate_count() -> int:
	return _candidates.size()


func get_current_component() -> String:
	return _current_component


func get_current_text() -> String:
	return _label.text


func force_refresh() -> void:
	_refresh_label()


func _refresh_label() -> void:
	if not _active or not _player or not _main:
		_panel.visible = false
		return

	var nearest = null
	var nearest_distance := detection_distance
	for candidate in _candidates:
		var node: Node3D = candidate["node"]
		if abs(_player.global_position.y - node.global_position.y) > 1.5:
			continue
		var distance := _player.global_position.distance_to(node.global_position)
		if distance < nearest_distance:
			nearest = candidate
			nearest_distance = distance

	if nearest == null:
		_current_component = ""
		_panel.visible = false
		return

	var definition: Dictionary = nearest["definition"]
	_current_component = str(definition["node"])
	_label.text = _format_component(definition, _main.get_latest_frame())
	_panel.visible = true


func _format_component(definition: Dictionary, frame: Dictionary) -> String:
	var title := str(definition["title"])
	var state := str(frame.get("state", "SYSTEM_STARTUP"))
	match str(definition["kind"]):
		"z1":
			return "%s\nADC: %d  |  Estado: %s" % [title, int(frame.get("zone1_adc", 0)), str(frame.get("zone1_level", "NORMAL"))]
		"z2":
			return "%s\nADC: %d  |  Estado: %s" % [title, int(frame.get("zone2_adc", 0)), str(frame.get("zone2_level", "NORMAL"))]
		"auto_valve", "main_valve":
			return "%s\nPosicion: %s  |  Sistema: %s" % [title, str(frame.get("valve", "CLOSED")), state]
		"esp32":
			return "%s\nEstado visual: %s" % [title, state]
		"buzzer":
			return "%s\nEstado: %s" % [title, "ON" if bool(frame.get("buzzer", false)) else "OFF"]
		"led_green":
			return "%s\nEstado: %s" % [title, "ON" if state == "SYSTEM_NORMAL" else "OFF"]
		"led_red":
			var active := str(frame.get("valve", "CLOSED")) == "CLOSED" or state in ["SYSTEM_CRITICAL", "SYSTEM_SAFE_LATCHED", "SYSTEM_FAULT"]
			return "%s\nEstado: %s" % [title, "ON" if active else "OFF"]
		"meter":
			return "%s\nFuente: %s  |  Sistema: %s" % [title, _main.get_source_name(), state]
		_:
			return "%s\nComponente fisico del gemelo digital" % title


func _build_interface() -> void:
	var root_control := Control.new()
	root_control.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root_control)

	_panel = PanelContainer.new()
	_panel.anchor_left = 0.5
	_panel.anchor_right = 0.5
	_panel.anchor_top = 1.0
	_panel.anchor_bottom = 1.0
	_panel.offset_left = -245.0
	_panel.offset_right = 245.0
	_panel.offset_top = -110.0
	_panel.offset_bottom = -28.0
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.035, 0.045, 0.055, 0.94)
	style.border_color = Color(0.24, 0.72, 0.62, 0.9)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	style.content_margin_top = 10.0
	style.content_margin_bottom = 10.0
	_panel.add_theme_stylebox_override("panel", style)
	root_control.add_child(_panel)

	_label = Label.new()
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.add_theme_font_size_override("font_size", 15)
	_label.add_theme_color_override("font_color", Color(0.92, 0.97, 0.96))
	_panel.add_child(_label)
	_panel.visible = false
