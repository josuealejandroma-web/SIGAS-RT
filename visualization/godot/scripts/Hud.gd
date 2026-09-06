extends CanvasLayer

signal scenario_requested(command: String)
signal view_requested(view_name: String)

const GraphPanelScene := preload("res://scripts/GraphPanel.gd")
const DISPLAY_FULL := 0
const DISPLAY_COMPACT := 1
const DISPLAY_HIDDEN := 2

var labels := {}
var compact_labels := {}
var graph: Control
var samples: Array[float] = []
var _full_panel: PanelContainer
var _compact_panel: PanelContainer
var _display_mode := DISPLAY_FULL
var _source_name := "REPLAY"


func _ready() -> void:
	layer = 12
	var root_control := Control.new()
	root_control.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root_control)
	_build_full_hud(root_control)
	_build_compact_hud(root_control)
	set_display_mode(DISPLAY_FULL)


func apply_telemetry(frame: Dictionary) -> void:
	var zone1_adc := int(frame.get("zone1_adc", 0))
	var zone2_adc := int(frame.get("zone2_adc", 0))
	var response_us := int(frame.get("response_us", 0))
	var deadline_us := int(frame.get("deadline_us", 500000))
	var result := str(frame.get("result", "-"))
	var state := str(frame.get("state", "-"))
	var valve := str(frame.get("valve", "-"))

	labels["state"].text = "Estado: %s" % state
	labels["action"].text = "Accion: %s" % str(frame.get("action", "-"))
	labels["zone1"].text = "Zona 1: ADC %d / %s" % [zone1_adc, str(frame.get("zone1_level", "-"))]
	labels["zone2"].text = "Zona 2: ADC %d / %s" % [zone2_adc, str(frame.get("zone2_level", "-"))]
	labels["valve"].text = "Valvula: %s / buzzer %s" % [valve, "ON" if bool(frame.get("buzzer", false)) else "OFF"]
	labels["deadline"].text = "RT-03: %d us / %d us / %s" % [response_us, deadline_us, result]

	compact_labels["state"].text = "Estado: " + state
	compact_labels["zones"].text = "Z1 ADC %d  |  Z2 ADC %d" % [zone1_adc, zone2_adc]
	compact_labels["valve"].text = "Valvula: " + valve
	compact_labels["source"].text = "Fuente: " + _source_name

	samples.append(max(zone1_adc, zone2_adc) / 4095.0)
	if samples.size() > 80:
		samples.pop_front()
	graph.set("samples", samples)
	graph.queue_redraw()


func show_bridge_status(text: String) -> void:
	labels["bridge"].text = "Bridge: " + text


func set_source(source_name: String) -> void:
	_source_name = source_name
	compact_labels["source"].text = "Fuente: " + _source_name


func set_display_mode(mode: int) -> void:
	_display_mode = clampi(mode, DISPLAY_FULL, DISPLAY_HIDDEN)
	_full_panel.visible = _display_mode == DISPLAY_FULL
	_compact_panel.visible = _display_mode == DISPLAY_COMPACT


func cycle_display_mode() -> int:
	set_display_mode((_display_mode + 1) % 3)
	return _display_mode


func get_display_mode() -> int:
	return _display_mode


func get_display_mode_name() -> String:
	match _display_mode:
		DISPLAY_COMPACT:
			return "COMPACTO"
		DISPLAY_HIDDEN:
			return "OCULTO"
		_:
			return "COMPLETO"


func _build_full_hud(parent: Control) -> void:
	_full_panel = PanelContainer.new()
	_full_panel.position = Vector2(16, 78)
	_full_panel.custom_minimum_size = Vector2(360, 330)
	_full_panel.add_theme_stylebox_override("panel", _panel_style())
	parent.add_child(_full_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 7)
	_full_panel.add_child(box)

	var title := Label.new()
	title.text = "SIGAS-RT"
	title.add_theme_font_size_override("font_size", 23)
	title.add_theme_color_override("font_color", Color(0.36, 0.90, 0.75))
	box.add_child(title)

	for key in ["state", "action", "zone1", "zone2", "valve", "deadline", "bridge"]:
		var label := Label.new()
		label.text = key + ": -"
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
		labels[key] = label

	graph = GraphPanelScene.new()
	graph.custom_minimum_size = Vector2(328, 64)
	box.add_child(graph)

	var buttons := GridContainer.new()
	buttons.columns = 2
	buttons.add_theme_constant_override("h_separation", 6)
	buttons.add_theme_constant_override("v_separation", 6)
	box.add_child(buttons)
	_add_button(buttons, "Seguro", "RUN_SAFE")
	_add_button(buttons, "Normal", "RUN_NORMAL")
	_add_button(buttons, "Fuga Cocina", "FUGA COCINA")
	_add_button(buttons, "Fuga Calefon", "FUGA CALEFON")
	_add_button(buttons, "Doble", "RUN_BOTH_LEAK")
	_add_button(buttons, "Pico Aislado", "PICO AISLADO")
	_add_button(buttons, "Falla Sensor", "FALLA SENSOR")
	_add_button(buttons, "Full Demo", "FULL DEMO")

	var views := GridContainer.new()
	views.columns = 3
	views.add_theme_constant_override("h_separation", 6)
	views.add_theme_constant_override("v_separation", 6)
	box.add_child(views)
	_add_view_button(views, "Exterior", "exterior")
	_add_view_button(views, "PB", "ground")
	_add_view_button(views, "PA", "upper")
	_add_view_button(views, "Cocina", "kitchen")
	_add_view_button(views, "Tecnica", "technical")
	_add_view_button(views, "Control", "control")


func _build_compact_hud(parent: Control) -> void:
	_compact_panel = PanelContainer.new()
	_compact_panel.position = Vector2(16, 78)
	_compact_panel.custom_minimum_size = Vector2(300, 142)
	_compact_panel.add_theme_stylebox_override("panel", _panel_style())
	parent.add_child(_compact_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	_compact_panel.add_child(box)
	var title := Label.new()
	title.text = "SIGAS-RT"
	title.add_theme_font_size_override("font_size", 19)
	title.add_theme_color_override("font_color", Color(0.36, 0.90, 0.75))
	box.add_child(title)
	for key in ["state", "zones", "valve", "source"]:
		var label := Label.new()
		label.text = key + ": -"
		label.add_theme_font_size_override("font_size", 13)
		box.add_child(label)
		compact_labels[key] = label


func _add_button(parent: Control, text: String, command: String) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(150, 30)
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(func() -> void: scenario_requested.emit(command))
	parent.add_child(button)


func _add_view_button(parent: Control, text: String, view_name: String) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(98, 29)
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(func() -> void: view_requested.emit(view_name))
	parent.add_child(button)


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.025, 0.035, 0.045, 0.94)
	style.border_color = Color(0.20, 0.28, 0.32, 0.95)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	style.content_margin_top = 10.0
	style.content_margin_bottom = 10.0
	return style
