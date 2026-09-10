extends RefCounted

const TelemetryProtocol := preload("res://scripts/TelemetryProtocol.gd")
const FORMAT := "sigas-recorded-replay-v1"

var frames: Array[Dictionary] = []
var metadata: Dictionary = {}
var error_message := ""


func load_file(path: String) -> bool:
	if not FileAccess.file_exists(path):
		_reset()
		return _fail("recording file does not exist")
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		_reset()
		return _fail("recording file could not be opened")
	return load_text(file.get_as_text())


func load_text(content: String) -> bool:
	_reset()
	var previous_time := -1
	var line_number := 0
	for raw_line in content.split("\n"):
		line_number += 1
		var line := raw_line.strip_edges()
		if line.is_empty():
			continue
		var parser := JSON.new()
		if parser.parse(line) != OK:
			return _fail("invalid JSON object at line %d" % line_number)
		var parsed = parser.data
		if typeof(parsed) != TYPE_DICTIONARY:
			return _fail("invalid JSON object at line %d" % line_number)
		var item: Dictionary = parsed
		match item.get("kind"):
			"metadata":
				if not metadata.is_empty() or not frames.is_empty():
					return _fail("metadata must be the first record")
				if item.get("format") != FORMAT:
					return _fail("unsupported replay format")
				if typeof(item.get("source")) != TYPE_STRING or str(item["source"]).is_empty():
					return _fail("recording source is missing")
				if typeof(item.get("source_sha256")) != TYPE_STRING or str(item["source_sha256"]).length() != 64:
					return _fail("recording source hash is invalid")
				metadata = item.duplicate(true)
			"frame":
				if metadata.is_empty():
					return _fail("frame precedes metadata")
				var relative_ms = _normalized_nonnegative_integer(item.get("relative_ms"))
				if relative_ms == null or int(relative_ms) < previous_time:
					return _fail("frame time is invalid or out of order")
				var payload := TelemetryProtocol.validate_payload(item.get("payload"))
				if payload.is_empty():
					return _fail("invalid telemetry payload at line %d" % line_number)
				previous_time = int(relative_ms)
				frames.append({"relative_ms": int(relative_ms), "payload": payload})
			_:
				return _fail("unknown replay record at line %d" % line_number)

	if metadata.is_empty() or frames.is_empty():
		return _fail("recording contains no validated frames")
	return true


func get_frames() -> Array[Dictionary]:
	return frames.duplicate(true)


func get_source() -> String:
	return str(metadata.get("source", ""))


func get_error() -> String:
	return error_message


func _fail(message: String) -> bool:
	frames.clear()
	metadata.clear()
	error_message = message
	return false


func _reset() -> void:
	frames.clear()
	metadata.clear()
	error_message = ""


func _normalized_nonnegative_integer(value: Variant) -> Variant:
	if typeof(value) == TYPE_INT:
		return int(value) if int(value) >= 0 else null
	if typeof(value) == TYPE_FLOAT:
		var float_value := float(value)
		if is_finite(float_value) and float_value == floor(float_value) and float_value >= 0.0:
			return int(float_value)
	return null
