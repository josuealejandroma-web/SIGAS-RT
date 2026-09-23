import type { TelemetryFrameV2, ValidatedTelemetry, TelemetrySource, SystemState, EventType, ValveState } from './types';

const VALID_SOURCES: TelemetrySource[] = ['MOCK_SIM', 'MATLAB_SIM', 'RECORDED_REPLAY'];
const VALID_SYSTEM_STATES: SystemState[] = ['STARTUP', 'NORMAL', 'WARNING', 'CRITICAL', 'SAFE_LATCHED', 'FAULT'];
const VALID_EVENT_TYPES: EventType[] = ['NONE', 'GAS_LEAK', 'PRESSURE_ANOMALY', 'PIPE_RUPTURE', 'SUPPLY_PRESSURE_LOSS', 'SENSOR_FAULT', 'MULTI_ZONE'];
const VALID_VALVE_STATES: ValveState[] = ['OPEN', 'CLOSED'];
const VALID_GAS_LEVELS = ['NORMAL', 'WARNING', 'CRITICAL', 'FAULT'];

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isValidSource(s: unknown): s is TelemetrySource {
  return typeof s === 'string' && VALID_SOURCES.includes(s as TelemetrySource);
}

function isValidSystemState(s: unknown): s is SystemState {
  return typeof s === 'string' && VALID_SYSTEM_STATES.includes(s as SystemState);
}

function isValidEventType(s: unknown): s is EventType {
  return typeof s === 'string' && VALID_EVENT_TYPES.includes(s as EventType);
}

function isValidValveState(s: unknown): s is ValveState {
  return typeof s === 'string' && VALID_VALVE_STATES.includes(s as ValveState);
}

function isValidGasLevel(s: unknown): s is string {
  return typeof s === 'string' && VALID_GAS_LEVELS.includes(s);
}

function validateGasZone(obj: unknown): obj is TelemetryFrameV2['gas']['Z1'] {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    isFiniteNumber(o.adc) &&
    isValidGasLevel(o.level) &&
    typeof o.valid === 'boolean'
  );
}

function validatePressure(obj: unknown): obj is TelemetryFrameV2['pressure'] {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    isFiniteNumber(o.P0) &&
    isFiniteNumber(o.P1) &&
    isFiniteNumber(o.PK) &&
    isFiniteNumber(o.PL) &&
    isFiniteNumber(o.PT)
  );
}

function validateFlow(obj: unknown): obj is TelemetryFrameV2['flow'] {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return isFiniteNumber(o.main) && isFiniteNumber(o.living);
}

function validateValves(obj: unknown): obj is TelemetryFrameV2['valves'] {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    isValidValveState(o.VM) &&
    isValidValveState(o.VK) &&
    isValidValveState(o.VL) &&
    isValidValveState(o.VT)
  );
}

function validateGasObject(obj: unknown): obj is { Z1: unknown; Z2: unknown; Z3: unknown } {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return 'Z1' in o && 'Z2' in o && 'Z3' in o;
}

export function validateTelemetryFrame(data: unknown): ValidatedTelemetry | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (d.schemaVersion !== 2) return null;
  if (d.runId !== undefined && typeof d.runId !== 'string') return null;
  if (d.flowUnit !== undefined && !['kg/s', 'L/min'].includes(String(d.flowUnit))) return null;
  if (!isValidSource(d.source)) return null;
  if (!isFiniteNumber(d.sequence)) return null;
  if (!isFiniteNumber(d.simTime)) return null;
  if (!isFiniteNumber(d.timestamp)) return null;
  if (!isValidSystemState(d.systemState)) return null;
  if (!isValidEventType(d.eventType)) return null;
  if (!isFiniteNumber(d.affectedZoneMask)) return null;

  if (!validateGasObject(d.gas)) return null;
  const gasObj = d.gas as { Z1: unknown; Z2: unknown; Z3: unknown };
  if (!validateGasZone(gasObj.Z1)) return null;
  if (!validateGasZone(gasObj.Z2)) return null;
  if (!validateGasZone(gasObj.Z3)) return null;

  if (!validatePressure(d.pressure)) return null;
  if (!validateFlow(d.flow)) return null;
  if (!validateValves(d.valves)) return null;

  if (typeof d.buzzer !== 'boolean') return null;
  if (typeof d.greenLed !== 'boolean') return null;
  if (typeof d.redLed !== 'boolean') return null;

  return {
    ...d,
    schemaVersion: 2,
    source: d.source,
    sequence: d.sequence,
    simTime: d.simTime,
    timestamp: d.timestamp,
    systemState: d.systemState,
    eventType: d.eventType,
    affectedZoneMask: d.affectedZoneMask,
    gas: d.gas as TelemetryFrameV2['gas'],
    pressure: d.pressure as TelemetryFrameV2['pressure'],
    flow: d.flow as TelemetryFrameV2['flow'],
    valves: d.valves as TelemetryFrameV2['valves'],
    buzzer: d.buzzer,
    greenLed: d.greenLed,
    redLed: d.redLed,
    _validated: true,
    _receivedAt: performance.now(),
  };
}

export function parseTelemetryJson(json: string): ValidatedTelemetry | null {
  try {
    const parsed = JSON.parse(json);
    return validateTelemetryFrame(parsed);
  } catch {
    return null;
  }
}
