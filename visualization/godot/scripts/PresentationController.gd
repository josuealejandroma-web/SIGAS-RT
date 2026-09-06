extends CanvasLayer

enum Mode { TOUR, FREE_WALK, TECHNICAL }

const QUICK_POSES := {
	1: {"name": "EXTERIOR / FACHADA", "position": Vector3(3.65, 0.16, 5.25), "yaw": 0.0, "pitch": -0.12},
	2: {"name": "SALA / COMEDOR", "position": Vector3(-0.85, 0.18, 2.45), "yaw": -0.65},
	3: {"name": "COCINA / ZONA 1", "position": Vector3(-2.35, 0.18, -1.20), "yaw": 0.75},
	4: {"name": "AREA TECNICA / ZONA 2", "position": Vector3(2.65, 0.18, -1.35), "yaw": -0.25},
	5: {"name": "MEDIDOR Y VALVULAS", "position": Vector3(-5.85, 0.16, -1.80), "yaw": 0.0},
	6: {"name": "PANEL SIGAS / ESP32", "position": Vector3(0.25, 0.18, 1.90), "yaw": PI},
	7: {"name": "PLANTA ALTA", "position": Vector3(1.25, 3.32, 1.80), "yaw": -PI / 2.0, "pitch": -0.58},
	8: {"name": "DORMITORIO PRINCIPAL", "position": Vector3(-3.25, 3.32, -0.65), "yaw": 0.0, "pitch": -0.68},
	9: {"name": "BALCON / VISTA GENERAL", "position": Vector3(0.0, 3.75, 4.18), "yaw": -PI / 2.0, "pitch": -0.38}
}

const PORTAL_LABELS := {
	"entry_in": "ENTRADA",
	"entry_out": "FACHADA",
	"technical_in": "AREA TECNICA",
	"technical_out": "PLANTA BAJA",
	"stairs_up": "PLANTA ALTA",
	"stairs_down": "PLANTA BAJA",
	"master_in": "DORMITORIO PRINCIPAL",
	"master_out": "PASILLO SUPERIOR",
	"bedroom2_in": "DORMITORIO SECUNDARIO",
	"bedroom2_out": "PASILLO SUPERIOR",
	"upper_bath_in": "BANO SUPERIOR",
	"upper_bath_out": "PASILLO SUPERIOR",
	"balcony_out": "BALCON",
	"balcony_in": "PLANTA ALTA"
}

var _main: Node
var _twin: Node3D
var _free_walk: CharacterBody3D
var _orbit: Node3D
var _hud: CanvasLayer
var _navigation: Node3D
var _labels: CanvasLayer
var _configured := false
var _current_mode := Mode.FREE_WALK
var _free_technical := false
var _presentation_mode := false

var _mode_label: Label
var _mode_buttons := {}
var _help_panel: PanelContainer
var _help_visible := false
var _crosshair: Control
var _toast: Label
var _toast_time := 0.0


func _ready() -> void:
	layer = 24
	_build_interface()


func configure(
	main: Node,
	twin: Node3D,
	free_walk: CharacterBody3D,
	orbit: Node3D,
	hud: CanvasLayer,
	navigation: Node3D,
	labels: CanvasLayer
) -> void:
	_main = main
	_twin = twin
	_free_walk = free_walk
	_orbit = orbit
	_hud = hud
	_navigation = navigation
	_labels = labels
	if not _free_walk.speed_changed.is_connected(_on_speed_changed):
		_free_walk.speed_changed.connect(_on_speed_changed)
	if not _navigation.portal_used.is_connected(_on_portal_used):
		_navigation.portal_used.connect(_on_portal_used)
	_configured = true
	switch_mode(Mode.FREE_WALK, false)


func _process(delta: float) -> void:
	if _toast_time <= 0.0:
		return
	_toast_time -= delta
	if _toast_time <= 0.0:
		_toast.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if not _configured or not (event is InputEventKey) or not event.pressed or event.echo:
		return

	if event.keycode == KEY_F1:
		toggle_help()
		get_viewport().set_input_as_handled()
		return
	if event.keycode == KEY_ESCAPE and _help_visible:
		toggle_help(false)
		get_viewport().set_input_as_handled()
		return
	if _help_visible:
		return

	match event.keycode:
		KEY_1:
			trigger_quick_zone(1)
		KEY_2:
			trigger_quick_zone(2)
		KEY_3:
			trigger_quick_zone(3)
		KEY_4:
			trigger_quick_zone(4)
		KEY_5:
			trigger_quick_zone(5)
		KEY_6:
			trigger_quick_zone(6)
		KEY_7:
			trigger_quick_zone(7)
		KEY_8:
			trigger_quick_zone(8)
		KEY_9:
			trigger_quick_zone(9)
		KEY_0:
			switch_mode(Mode.TECHNICAL)
		KEY_G:
			go_to_ground_floor()
		KEY_U:
			go_to_upper_floor()
		KEY_T:
			toggle_technical_view()
		KEY_H:
			_hud.cycle_display_mode()
			show_toast("HUD: " + _hud.get_display_mode_name())
		KEY_R:
			reset_free_camera()
		KEY_F5:
			toggle_presentation_mode()
		KEY_SPACE, KEY_P:
			var paused: bool = _main.toggle_local_replay()
			show_toast("REPLAY: " + ("PAUSA" if paused else "ACTIVO"))
		_:
			return
	get_viewport().set_input_as_handled()


func switch_mode(mode_id: int, show_notice := true) -> void:
	if not _configured:
		return
	_current_mode = mode_id
	_free_technical = false
	match _current_mode:
		Mode.TOUR:
			_free_walk.set_active(false)
			_labels.set_active(false)
			_twin.set_technical_view(false)
			_orbit.set_active(true)
			_orbit.start_auto_tour(_twin)
			if show_notice:
				show_toast("TOUR GODOT: RECORRIDO ORBITAL | TOUR COMPLETO: BLENDER")
		Mode.TECHNICAL:
			_free_walk.set_active(false)
			_labels.set_active(false)
			_orbit.stop_auto_tour()
			_orbit.set_active(true)
			_twin.set_technical_view(true)
			_orbit.set_view("cutaway", _twin)
			if show_notice:
				show_toast("VISTA TECNICA GENERAL")
		_:
			_orbit.stop_auto_tour()
			_orbit.set_active(false)
			_twin.set_technical_view(false)
			_free_walk.set_active(true, DisplayServer.get_name() != "headless")
			_labels.set_active(true)
			if show_notice:
				show_toast("EXPLORACION LIBRE")
	_update_mode_interface()


func trigger_quick_zone(index: int) -> bool:
	if not QUICK_POSES.has(index):
		return false
	switch_mode(Mode.FREE_WALK, false)
	var pose: Dictionary = QUICK_POSES[index]
	_free_walk.teleport_to_pose(pose["position"], pose["yaw"], float(pose.get("pitch", 0.0)))
	show_toast("ZONA %d: %s" % [index, pose["name"]])
	return true


func go_to_ground_floor() -> void:
	switch_mode(Mode.FREE_WALK, false)
	_free_walk.teleport_to_pose(Vector3(0.95, 0.18, -1.32), PI)
	show_toast("PLANTA BAJA")


func go_to_upper_floor() -> void:
	trigger_quick_zone(7)


func toggle_technical_view() -> void:
	if _current_mode != Mode.FREE_WALK:
		switch_mode(Mode.FREE_WALK, false)
	_free_technical = not _free_technical
	_twin.set_technical_view(_free_technical)
	show_toast("VISTA " + ("TECNICA" if _free_technical else "ARQUITECTONICA"))
	_update_mode_interface()


func reset_free_camera() -> void:
	switch_mode(Mode.FREE_WALK, false)
	_free_walk.reset_to_start()
	show_toast("CAMARA RESTABLECIDA")


func toggle_help(force_visible = null) -> void:
	_help_visible = not _help_visible if force_visible == null else bool(force_visible)
	_help_panel.visible = _help_visible
	if _help_visible:
		_free_walk.release_mouse()
	elif _current_mode == Mode.FREE_WALK:
		_free_walk.capture_mouse()
	_update_mode_interface()


func toggle_presentation_mode() -> void:
	_presentation_mode = not _presentation_mode
	if _presentation_mode:
		switch_mode(Mode.FREE_WALK, false)
		_free_walk.reset_to_start()
		_hud.set_display_mode(_hud.DISPLAY_COMPACT)
		show_toast("PRESENTATION MODE: ACTIVO")
	else:
		_hud.set_display_mode(_hud.DISPLAY_FULL)
		show_toast("PRESENTATION MODE: DESACTIVADO")


func show_orbit_view(view_name: String) -> void:
	if view_name == "technical":
		switch_mode(Mode.TECHNICAL)
		return
	switch_mode(Mode.TOUR, false)
	_orbit.stop_auto_tour()
	_twin.set_technical_view(false)
	_orbit.set_view(view_name, _twin)
	show_toast("VISTA: " + view_name.to_upper())


func is_free_mode() -> bool:
	return _current_mode == Mode.FREE_WALK


func get_mode_id() -> int:
	return _current_mode


func get_mode_name() -> String:
	match _current_mode:
		Mode.TOUR:
			return "TOUR"
		Mode.TECHNICAL:
			return "VISTA TECNICA"
		_:
			return "EXPLORACION LIBRE"


func is_help_visible() -> bool:
	return _help_visible


func is_presentation_mode() -> bool:
	return _presentation_mode


func get_quick_pose(index: int) -> Dictionary:
	return QUICK_POSES.get(index, {})


func show_toast(text: String) -> void:
	_toast.text = text
	_toast.visible = true
	_toast_time = 2.8


func _on_speed_changed(_speed: float) -> void:
	_update_mode_interface()
	show_toast("VELOCIDAD: %.2f m/s" % _free_walk.get_walk_speed())


func _on_portal_used(portal_name: String) -> void:
	show_toast("PASO SEGURO: " + str(PORTAL_LABELS.get(portal_name, portal_name)).to_upper())


func _update_mode_interface() -> void:
	var suffix := ""
	if _current_mode == Mode.FREE_WALK:
		suffix = " / TECNICA" if _free_technical else ""
		suffix += "  |  %.2f m/s" % _free_walk.get_walk_speed()
	_mode_label.text = "MODO: " + get_mode_name() + suffix
	for mode_id in _mode_buttons:
		_mode_buttons[mode_id].button_pressed = int(mode_id) == _current_mode
	_crosshair.visible = _current_mode == Mode.FREE_WALK and not _help_visible


func _build_interface() -> void:
	var root_control := Control.new()
	root_control.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root_control)

	var menu := PanelContainer.new()
	menu.anchor_left = 0.5
	menu.anchor_right = 0.5
	menu.offset_left = -365.0
	menu.offset_right = 365.0
	menu.offset_top = 14.0
	menu.offset_bottom = 64.0
	menu.add_theme_stylebox_override("panel", _panel_style(Color(0.025, 0.035, 0.045, 0.94), Color(0.20, 0.28, 0.32, 0.95)))
	root_control.add_child(menu)

	var menu_box := HBoxContainer.new()
	menu_box.add_theme_constant_override("separation", 6)
	menu.add_child(menu_box)
	_add_mode_button(menu_box, "TOUR", Mode.TOUR, 105.0)
	_add_mode_button(menu_box, "EXPLORACION LIBRE", Mode.FREE_WALK, 190.0)
	_add_mode_button(menu_box, "VISTA TECNICA", Mode.TECHNICAL, 145.0)

	var separator := VSeparator.new()
	separator.custom_minimum_size.x = 8.0
	menu_box.add_child(separator)

	_mode_label = Label.new()
	_mode_label.custom_minimum_size = Vector2(245, 0)
	_mode_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_mode_label.add_theme_font_size_override("font_size", 13)
	_mode_label.add_theme_color_override("font_color", Color(0.76, 0.88, 0.86))
	menu_box.add_child(_mode_label)

	_build_crosshair(root_control)
	_build_help(root_control)
	_build_toast(root_control)


func _add_mode_button(parent: Control, text: String, mode_id: int, width: float) -> void:
	var button := Button.new()
	button.text = text
	button.toggle_mode = true
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(width, 34)
	button.pressed.connect(func() -> void: switch_mode(mode_id))
	parent.add_child(button)
	_mode_buttons[mode_id] = button


func _build_crosshair(parent: Control) -> void:
	_crosshair = Control.new()
	_crosshair.set_anchors_preset(Control.PRESET_CENTER)
	_crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(_crosshair)
	var horizontal := ColorRect.new()
	horizontal.position = Vector2(-6, -1)
	horizontal.size = Vector2(12, 2)
	horizontal.color = Color(0.92, 0.96, 0.94, 0.78)
	horizontal.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_crosshair.add_child(horizontal)
	var vertical := ColorRect.new()
	vertical.position = Vector2(-1, -6)
	vertical.size = Vector2(2, 12)
	vertical.color = Color(0.92, 0.96, 0.94, 0.78)
	vertical.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_crosshair.add_child(vertical)


func _build_help(parent: Control) -> void:
	_help_panel = PanelContainer.new()
	_help_panel.anchor_left = 0.5
	_help_panel.anchor_right = 0.5
	_help_panel.anchor_top = 0.5
	_help_panel.anchor_bottom = 0.5
	_help_panel.offset_left = -260.0
	_help_panel.offset_right = 260.0
	_help_panel.offset_top = -215.0
	_help_panel.offset_bottom = 215.0
	_help_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.025, 0.035, 0.045, 0.98), Color(0.24, 0.72, 0.62, 1.0)))
	parent.add_child(_help_panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	_help_panel.add_child(box)
	var title := Label.new()
	title.text = "CONTROLES"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color(0.36, 0.90, 0.75))
	box.add_child(title)

	var help_text := Label.new()
	help_text.text = "WASD       Mover\nMouse      Mirar\nShift      Rapido\nCtrl       Inspeccion lenta\nRueda      Ajustar velocidad\nT          Vista tecnica\nH          HUD completo / compacto / oculto\n1-9        Ir a zona\n0          Vista tecnica general\nG / U      Planta baja / alta\nSpace / P  Pausar replay local\nR          Restablecer camara\nF5         Presentation Mode\nF1 / Esc   Cerrar ayuda\nEsc        Liberar / capturar mouse"
	help_text.add_theme_font_size_override("font_size", 16)
	help_text.add_theme_constant_override("line_spacing", 5)
	box.add_child(help_text)
	_help_panel.visible = false


func _build_toast(parent: Control) -> void:
	_toast = Label.new()
	_toast.anchor_left = 0.5
	_toast.anchor_right = 0.5
	_toast.anchor_top = 1.0
	_toast.anchor_bottom = 1.0
	_toast.offset_left = -300.0
	_toast.offset_right = 300.0
	_toast.offset_top = -27.0
	_toast.offset_bottom = -5.0
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_toast.add_theme_font_size_override("font_size", 13)
	_toast.add_theme_color_override("font_color", Color(0.82, 0.94, 0.91))
	_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_toast.visible = false
	parent.add_child(_toast)


func _panel_style(background: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 10.0
	style.content_margin_right = 10.0
	style.content_margin_top = 7.0
	style.content_margin_bottom = 7.0
	return style
