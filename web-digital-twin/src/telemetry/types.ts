export type TelemetrySource = 'MOCK_SIM' | 'MATLAB_SIM' | 'RECORDED_REPLAY';

export type SystemState =
  | 'STARTUP'
  | 'NORMAL'
  | 'WARNING'
  | 'CRITICAL'
  | 'SAFE_LATCHED'
  | 'FAULT';

export type EventType =
  | 'NONE'
  | 'GAS_LEAK'
  | 'PRESSURE_ANOMALY'
  | 'PIPE_RUPTURE'
  | 'SUPPLY_PRESSURE_LOSS'
  | 'SENSOR_FAULT'
  | 'MULTI_ZONE';

export type ValveState = 'OPEN' | 'CLOSED';

export interface GasZone {
  adc: number;
  level: string;
  valid: boolean;
}

export interface PressureData {
  P0: number;
  P1: number;
  PK: number;
  PL: number;
  PT: number;
}

export interface FlowData {
  main: number;
  living: number;
}

export interface ValveData {
  VM: ValveState;
  VK: ValveState;
  VL: ValveState;
  VT: ValveState;
}

export interface TelemetryFrameV2 {
  runId?: string;
  flowUnit?: 'kg/s' | 'L/min';
  schemaVersion: 2;
  source: TelemetrySource;
  sequence: number;
  simTime: number;
  timestamp: number;
  systemState: SystemState;
  eventType: EventType;
  affectedZoneMask: number;
  gas: {
    Z1: GasZone;
    Z2: GasZone;
    Z3: GasZone;
  };
  pressure: PressureData;
  flow: FlowData;
  valves: ValveData;
  buzzer: boolean;
  greenLed: boolean;
  redLed: boolean;
}

export interface ValidatedTelemetry extends TelemetryFrameV2 {
  _validated: true;
  _receivedAt: number;
}

export type ConnectionStatus = 'LIVE' | 'STALE' | 'DISCONNECTED';

export const CONNECTION_THRESHOLDS = {
  LIVE_MAX_MS: 1500,
  STALE_MAX_MS: 3000,
} as const;

export function getConnectionStatus(lastValidFrameTime: number, now: number): ConnectionStatus {
  const delta = now - lastValidFrameTime;
  if (delta < CONNECTION_THRESHOLDS.LIVE_MAX_MS) return 'LIVE';
  if (delta < CONNECTION_THRESHOLDS.STALE_MAX_MS) return 'STALE';
  return 'DISCONNECTED';
}

export const ZONE_MASKS = {
  ZONE_KITCHEN: 1 << 0,
  ZONE_TECHNICAL: 1 << 1,
  ZONE_LIVING: 1 << 2,
} as const;

export function getZoneName(mask: number): string {
  const names: string[] = [];
  if (mask & ZONE_MASKS.ZONE_KITCHEN) names.push('Cocina');
  if (mask & ZONE_MASKS.ZONE_TECHNICAL) names.push('Área técnica');
  if (mask & ZONE_MASKS.ZONE_LIVING) names.push('Living');
  return names.join(', ') || 'Ninguna';
}

export function getValveUpstreamPressure(valve: keyof ValveData, pressure: PressureData): number {
  switch (valve) {
    case 'VM': return pressure.P0;
    case 'VK': return pressure.P1;
    case 'VL': return pressure.P1;
    case 'VT': return pressure.P1;
    default: return 0;
  }
}

export function getValveDownstreamPressure(valve: keyof ValveData, pressure: PressureData): number {
  switch (valve) {
    case 'VM': return pressure.P1;
    case 'VK': return pressure.PK;
    case 'VL': return pressure.PL;
    case 'VT': return pressure.PT;
    default: return 0;
  }
}

export function getValveDeltaPressure(valve: keyof ValveData, pressure: PressureData): number {
  return getValveUpstreamPressure(valve, pressure) - getValveDownstreamPressure(valve, pressure);
}
