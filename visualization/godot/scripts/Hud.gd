extends CanvasLayer

signal scenario_requested(command: String)
signal view_requested(view_name: String)

const GraphPanelScene := preload("res://scripts/GraphPanel.gd")

var labels := {}
var graph: Control
var samples: Array[float] = []


func _ready() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var panel := PanelContainer.new()
	panel.position = Vector2(16, 16)
	panel.custom_minimum_size = Vector2(360, 330)
	root.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)

	var title := Label.new()
	title.text = "SIGAS-RT"
	title.add_theme_font_size_override("font_size", 24)
	box.add_child(title)

	for key in ["state", "action", "zone1", "zone2", "valve", "deadline", "bridge"]:
		var label := Label.new()
		label.text = key + ": -"
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
		labels[key] = label

	graph = GraphPanelScene.new()
	graph.custom_minimum_size = Vector2(328, 72)
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


func apply_telemetry(frame: Dictionary) -> void:
	var zone1_adc := int(frame.get("zone1_adc", 0))
	var zone2_adc := int(frame.get("zone2_adc", 0))
	var response_us := int(frame.get("response_us", 0))
	var deadline_us := int(frame.get("deadline_us", 500000))
	var result := str(frame.get("result", "-"))

	labels["state"].text = "Estado: %s" % str(frame.get("state", "-"))
	labels["action"].text = "Accion: %s" % str(frame.get("action", "-"))
	labels["zone1"].text = "Zona 1: ADC %d / %s" % [zone1_adc, str(frame.get("zone1_level", "-"))]
	labels["zone2"].text = "Zona 2: ADC %d / %s" % [zone2_adc, str(frame.get("zone2_level", "-"))]
	labels["valve"].text = "Valvula: %s / buzzer %s" % [str(frame.get("valve", "-")), "ON" if bool(frame.get("buzzer", false)) else "OFF"]
	labels["deadline"].text = "RT-03: %d us / %d us / %s" % [response_us, deadline_us, result]

	samples.append(max(zone1_adc, zone2_adc) / 4095.0)
	if samples.size() > 80:
		samples.pop_front()
	graph.set("samples", samples)
	graph.queue_redraw()


func show_bridge_status(text: String) -> void:
	labels["bridge"].text = "Bridge: " + text


func _add_button(parent: Control, text: String, command: String) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(150, 32)
	button.pressed.connect(func() -> void: scenario_requested.emit(command))
	parent.add_child(button)


func _add_view_button(parent: Control, text: String, view_name: String) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(98, 30)
	button.pressed.connect(func() -> void: view_requested.emit(view_name))
	parent.add_child(button)
