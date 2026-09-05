extends Control
class_name GraphPanel

var samples: Array[float] = []


func _draw() -> void:
	var rect := Rect2(Vector2.ZERO, size)
	draw_rect(rect, Color(0.04, 0.05, 0.06, 0.9), true)
	draw_rect(rect, Color(0.3, 0.33, 0.36), false, 1.0)
	draw_line(Vector2(0, size.y * 0.35), Vector2(size.x, size.y * 0.35), Color(0.8, 0.18, 0.1), 1.0)
	if samples.size() < 2:
		return
	var prev := Vector2(0, size.y * (1.0 - samples[0]))
	for i in range(1, samples.size()):
		var x := size.x * float(i) / float(max(samples.size() - 1, 1))
		var point := Vector2(x, size.y * (1.0 - samples[i]))
		draw_line(prev, point, Color(0.95, 0.78, 0.2), 2.0)
		prev = point
