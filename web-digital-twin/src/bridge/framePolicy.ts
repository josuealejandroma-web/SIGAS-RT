import type { ValidatedTelemetry } from '../telemetry';
export function belongsToRun(frame: ValidatedTelemetry | null, runId: string, lastSequence: number): frame is ValidatedTelemetry {
  return !!frame && !!runId && frame.source === 'MATLAB_SIM' && frame.runId === runId &&
    frame.sequence > lastSequence && frame.flowUnit === 'kg/s';
}
// Reloading a page cannot turn an old snapshot into fresh measurements.
export function receivedAt(timestamp: number, monotonicNow: number, wallNow: number): number {
  return monotonicNow - Math.max(0, wallNow - timestamp);
}
