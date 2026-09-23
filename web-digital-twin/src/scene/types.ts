import type { Entity } from '@playcanvas/react';

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  description: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'EXTERIOR',
    position: [12, 8, 15],
    rotation: [-25, 45, 0],
    description: 'Vista exterior completa',
  },
  {
    name: 'COCINA',
    position: [-3, 2.5, 4],
    rotation: [-15, -90, 0],
    description: 'Cocina sin paredes - Sensor GS1',
  },
  {
    name: 'LIVING',
    position: [4, 2.5, -3],
    rotation: [-15, 0, 0],
    description: 'Living sin paredes - Sensor GS3',
  },
  {
    name: 'AREA_TECNICA',
    position: [-4, 2.5, -4],
    rotation: [-15, 135, 0],
    description: 'Área técnica sin paredes - GS2, VT',
  },
  {
    name: 'MANIFOLD_MEDIDOR',
    position: [0, 3, 2],
    rotation: [-30, 180, 0],
    description: 'Manifold y medidor - VM, VK, P0, P1',
  },
  {
    name: 'VISTA_SUPERIOR',
    position: [0, 15, 0],
    rotation: [-90, 0, 0],
    description: 'Desde arriba - Activa XRAY',
  },
  {
    name: 'XRAY',
    position: [0, 10, 0],
    rotation: [-75, 45, 0],
    description: 'Activa XRAY - Tuberías internas',
  },
];

export interface SceneObjectRefs {
  gasSensors: Record<string, any>;
  pressureSensors: Record<string, any>;
  valves: Record<string, any>;
  pipes: Record<string, any>;
  indicators: Record<string, any>;
}

export type PerformanceMode = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ValveAnimationState {
  targetState: 'OPEN' | 'CLOSED';
  currentAngle: number;
  targetAngle: number;
  isAnimating: boolean;
  startTime: number;
  duration: number;
}

export const VALVE_ANIMATION_DURATION = 400;

export const VALVE_ANGLES = {
  OPEN: 0,
  CLOSED: -Math.PI / 2,
} as const;

export interface GasLeakEffectConfig {
  zone: 'Z1' | 'Z2' | 'Z3';
  intensity: number;
  particleCount: number;
  color: [number, number, number];
  size: number;
  lifetime: number;
}

export const GAS_LEAK_EFFECTS: Record<string, GasLeakEffectConfig> = {
  Z1: {
    zone: 'Z1',
    intensity: 0,
    particleCount: 30,
    color: [1.0, 0.6, 0.0],
    size: 0.15,
    lifetime: 2,
  },
  Z2: {
    zone: 'Z2',
    intensity: 0,
    particleCount: 30,
    color: [1.0, 0.6, 0.0],
    size: 0.15,
    lifetime: 2,
  },
  Z3: {
    zone: 'Z3',
    intensity: 0,
    particleCount: 30,
    color: [1.0, 0.6, 0.0],
    size: 0.15,
    lifetime: 2,
  },
};

export interface PressureVisualizationConfig {
  sensorId: string;
  pressure: number;
  minPressure: number;
  maxPressure: number;
  color: [number, number, number];
}

export const PRESSURE_SENSOR_CONFIG: Record<string, PressureVisualizationConfig> = {
  P0: { sensorId: 'P0', pressure: 0, minPressure: 0, maxPressure: 30, color: [0.2, 0.8, 1.0] },
  P1: { sensorId: 'P1', pressure: 0, minPressure: 0, maxPressure: 30, color: [0.2, 1.0, 0.6] },
  PK: { sensorId: 'PK', pressure: 0, minPressure: 0, maxPressure: 30, color: [1.0, 0.8, 0.2] },
  PL: { sensorId: 'PL', pressure: 0, minPressure: 0, maxPressure: 30, color: [1.0, 0.4, 0.2] },
  PT: { sensorId: 'PT', pressure: 0, minPressure: 0, maxPressure: 30, color: [0.8, 0.4, 1.0] },
};

export interface SystemStateColors {
  STARTUP: string;
  NORMAL: string;
  WARNING: string;
  CRITICAL: string;
  SAFE_LATCHED: string;
  FAULT: string;
}

export const SYSTEM_STATE_COLORS: SystemStateColors = {
  STARTUP: '#ffaa00',
  NORMAL: '#00cc66',
  WARNING: '#ffaa00',
  CRITICAL: '#ff3333',
  SAFE_LATCHED: '#ff3333',
  FAULT: '#cc00cc',
};

export const SYSTEM_STATE_LABELS: Record<string, string> = {
  STARTUP: '🔄 INICIANDO',
  NORMAL: '✅ NORMAL',
  WARNING: '⚠️ ADVERTENCIA',
  CRITICAL: '🔴 CRÍTICO',
  SAFE_LATCHED: '🔒 SEGURO (BLOQUEADO)',
  FAULT: '❌ FALLO',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  NONE: 'Ninguno',
  GAS_LEAK: 'Fuga de Gas',
  PRESSURE_ANOMALY: 'Anomalía de Presión',
  PIPE_RUPTURE: 'Ruptura de Tubería',
  SUPPLY_PRESSURE_LOSS: 'Pérdida de Presión de Suministro',
  SENSOR_FAULT: 'Fallo de Sensor',
  MULTI_ZONE: 'Múltiples Zonas',
};

export const VALVE_STATE_LABELS: Record<string, string> = {
  OPEN: '⬤ ABIERTA',
  CLOSED: '⬤ CERRADA',
};

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  LIVE: '🟢 EN VIVO',
  STALE: '🟡 RECIENTE',
  DISCONNECTED: '🔴 DESCONECTADO',
};

export const SOURCE_LABELS: Record<string, string> = {
  MOCK_SIM: '🧪 SIMULACIÓN LOCAL',
  MATLAB_SIM: '🔬 SIMULACIÓN MATLAB',
  RECORDED_REPLAY: '📼 REPLAY GRABADO',
};
