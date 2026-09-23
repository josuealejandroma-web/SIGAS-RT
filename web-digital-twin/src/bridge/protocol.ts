export const MATLAB_SCENARIOS = [
  'NORMAL', 'GAS_LEAK_KITCHEN', 'GAS_LEAK_TECHNICAL', 'GAS_LEAK_LIVING',
  'PIPE_RUPTURE_LIVING', 'PRESSURE_DROP_NO_GAS', 'FALSE_PRESSURE_SPIKE',
  'PRESSURE_SENSOR_FAILURE', 'GAS_SENSOR_FAILURE_Z3', 'MULTI_ZONE_LEAK', 'FULL_DEMO',
] as const;
export type MatlabPhase = 'offline' | 'starting' | 'idle' | 'computing' | 'playing' | 'completed' | 'error';
export interface MatlabStatus {
  connected: boolean;
  phase: MatlabPhase;
  scenario: string;
  runId: string;
  message: string;
}
export const OFFLINE_STATUS: MatlabStatus = { connected: false, phase: 'offline', scenario: '', runId: '', message: '' };
export const PHASE_LABELS: Record<MatlabPhase, string> = {
  offline: 'DESCONECTADO', starting: 'INICIANDO MATLAB', idle: 'LISTO', computing: 'CALCULANDO',
  playing: 'REPRODUCIENDO RESULTADOS', completed: 'SIMULACIÓN FINALIZADA', error: 'ERROR',
};
export function validScenario(value: unknown): value is typeof MATLAB_SCENARIOS[number] {
  return typeof value === 'string' && (MATLAB_SCENARIOS as readonly string[]).includes(value);
}
