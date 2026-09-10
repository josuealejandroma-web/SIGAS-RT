extends RefCounted

const VALID_STATES := {
	"SYSTEM_STARTUP": true,
	"SYSTEM_NORMAL": true,
	"SYSTEM_WARNING": true,
	"SYSTEM_CRITICAL": true,
	"SYSTEM_SAFE_LATCHED": true,
	"SYSTEM_FAULT": true
}
const VALID_ACTIONS := {"NORMAL": true, "WARNING": true, "SAFE_CLOSE": true, "ALARM_ONLY": true}
const VALID_LEVELS := {"NORMAL": true, "WARNING": true, "HIGH": true}
const VALID_VALVES := {"OPEN": true, "CLOSED": true}

const STATE_FIELDS := [
	"type",
	"seq",
	"state",
	"action",
	"reason",
	"zone1_adc",
	"zone2_adc",
	"zone1_level",
	"zone2_level",
	"reset",
	"valve",
	"buzzer",
	"sample_us",
	"decision_us",
	"deadline_us"
]


static func validate_payload(raw_payload: Variant) -> Dictionary:
	if typeof(raw_payload) != TYPE_DICTIONARY:
		return {}
	var payload: Dictionary = raw_payload
	if typeof(payload.get("type")) != TYPE_STRING:
		return {}
	match payload["type"]:
		"state":
			return _validate_state(payload)
		"timing":
			return _validate_timing(payload)
		_:
			return {}


static func _validate_state(payload: Dictionary) -> Dictionary:
	for field in STATE_FIELDS:
		if not payload.has(field):
			return {}
	if not _valid_string_member(payload["state"], VALID_STATES):
		return {}
	if not _valid_string_member(payload["action"], VALID_ACTIONS):
		return {}
	if typeof(payload["reason"]) != TYPE_STRING or str(payload["reason"]).is_empty():
		return {}
	if not _valid_string_member(payload["zone1_level"], VALID_LEVELS):
		return {}
	if not _valid_string_member(payload["zone2_level"], VALID_LEVELS):
		return {}
	if not _valid_string_member(payload["valve"], VALID_VALVES):
		return {}
	if typeof(payload["reset"]) != TYPE_BOOL or typeof(payload["buzzer"]) != TYPE_BOOL:
		return {}

	var seq = _normalized_integer(payload["seq"], 0)
	var zone1_adc = _normalized_integer(payload["zone1_adc"], 0, 4095)
	var zone2_adc = _normalized_integer(payload["zone2_adc"], 0, 4095)
	var sample_us = _normalized_integer(payload["sample_us"], 0)
	var decision_us = _normalized_integer(payload["decision_us"], 0)
	var deadline_us = _normalized_integer(payload["deadline_us"], 1)
	if seq == null or zone1_adc == null or zone2_adc == null:
		return {}
	if sample_us == null or decision_us == null or deadline_us == null:
		return {}

	return {
		"type": "state",
		"seq": seq,
		"state": payload["state"],
		"action": payload["action"],
		"reason": payload["reason"],
		"zone1_adc": zone1_adc,
		"zone2_adc": zone2_adc,
		"zone1_level": payload["zone1_level"],
		"zone2_level": payload["zone2_level"],
		"reset": payload["reset"],
		"valve": payload["valve"],
		"buzzer": payload["buzzer"],
		"sample_us": sample_us,
		"decision_us": decision_us,
		"deadline_us": deadline_us
	}


static func _validate_timing(payload: Dictionary) -> Dictionary:
	for field in [
		"type",
		"seq",
		"t_critical_confirmed_us",
		"t_actuator_received_us",
		"response_us",
		"deadline_us",
		"result"
	]:
		if not payload.has(field):
			return {}

	var seq = _normalized_integer(payload["seq"], 0)
	var confirmed_us = _normalized_integer(payload["t_critical_confirmed_us"], 0)
	var received_us = _normalized_integer(payload["t_actuator_received_us"], 0)
	var response_us = _normalized_integer(payload["response_us"], 0)
	var deadline_us = _normalized_integer(payload["deadline_us"], 1)
	if seq == null or confirmed_us == null or received_us == null:
		return {}
	if response_us == null or deadline_us == null or int(received_us) < int(confirmed_us):
		return {}
	var measured_response := int(received_us) - int(confirmed_us)
	if int(response_us) != measured_response:
		return {}
	var expected_result := "PASS" if measured_response <= int(deadline_us) else "FAIL"
	if typeof(payload["result"]) != TYPE_STRING or payload["result"] != expected_result:
		return {}

	return {
		"type": "timing",
		"seq": seq,
		"t_critical_confirmed_us": confirmed_us,
		"t_actuator_received_us": received_us,
		"response_us": response_us,
		"deadline_us": deadline_us,
		"result": expected_result
	}


static func _valid_string_member(value: Variant, allowed: Dictionary) -> bool:
	return typeof(value) == TYPE_STRING and allowed.has(value)


static func _normalized_integer(value: Variant, minimum: int, maximum := -1) -> Variant:
	var normalized: int
	if typeof(value) == TYPE_INT:
		normalized = int(value)
	elif typeof(value) == TYPE_FLOAT:
		var float_value := float(value)
		if not is_finite(float_value) or float_value != floor(float_value):
			return null
		normalized = int(float_value)
	else:
		return null
	if normalized < minimum or (maximum >= 0 and normalized > maximum):
		return null
	return normalized
