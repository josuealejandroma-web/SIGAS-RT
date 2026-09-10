extends RefCounted

const TelemetryProtocol := preload("res://scripts/TelemetryProtocol.gd")

const LIVE := "LIVE"
const STALE := "STALE"
const DISCONNECTED := "DISCONNECTED"
const TELEMETRY_STALE_MS := 1500
const TELEMETRY_DISCONNECTED_MS := 3000

var last_valid_telemetry_time_ms := -1
var connection_state := DISCONNECTED


func accept_payload(raw_payload: Variant, now_ms: int) -> Dictionary:
	var payload := TelemetryProtocol.validate_payload(raw_payload)
	if payload.is_empty():
		return {}
	last_valid_telemetry_time_ms = now_ms
	connection_state = LIVE
	return payload


func update_connection_state(now_ms: int) -> String:
	if last_valid_telemetry_time_ms < 0:
		connection_state = DISCONNECTED
		return connection_state
	var age_ms := maxi(0, now_ms - last_valid_telemetry_time_ms)
	if age_ms >= TELEMETRY_DISCONNECTED_MS:
		connection_state = DISCONNECTED
	elif age_ms >= TELEMETRY_STALE_MS:
		connection_state = STALE
	else:
		connection_state = LIVE
	return connection_state


func get_connection_state() -> String:
	return connection_state
