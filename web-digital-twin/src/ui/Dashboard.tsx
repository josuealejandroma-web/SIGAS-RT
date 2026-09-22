import { useDigitalTwinStore, selectLatestFrame, selectConnectionStatus, selectCurrentSource, selectSystemState, selectEventType, selectAffectedZoneMask, selectGasData, selectPressureData, selectFlowData, selectValveData, selectBuzzer, selectGreenLed, selectRedLed, selectPerformanceMode, selectFPS, selectFrameTime } from '../state/store';
import { SYSTEM_STATE_COLORS, SYSTEM_STATE_LABELS, EVENT_TYPE_LABELS, CONNECTION_STATUS_LABELS, SOURCE_LABELS, VALVE_STATE_LABELS } from '../scene/types';
import { getZoneName } from '../telemetry';
import { useMemo } from 'react';

export function Dashboard() {
  const latestFrame = useDigitalTwinStore(selectLatestFrame);
  const connectionStatus = useDigitalTwinStore(selectConnectionStatus);
  const currentSource = useDigitalTwinStore(selectCurrentSource);
  const systemState = useDigitalTwinStore(selectSystemState);
  const eventType = useDigitalTwinStore(selectEventType);
  const affectedZoneMask = useDigitalTwinStore(selectAffectedZoneMask);
  const gasData = useDigitalTwinStore(selectGasData);
  const pressureData = useDigitalTwinStore(selectPressureData);
  const flowData = useDigitalTwinStore(selectFlowData);
  const valveData = useDigitalTwinStore(selectValveData);
  const buzzer = useDigitalTwinStore(selectBuzzer);
  const greenLed = useDigitalTwinStore(selectGreenLed);
  const redLed = useDigitalTwinStore(selectRedLed);
  const performanceMode = useDigitalTwinStore(selectPerformanceMode);
  const fps = useDigitalTwinStore(selectFPS);
  const frameTime = useDigitalTwinStore(selectFrameTime);

  const systemStateColor = useMemo(() => systemState ? SYSTEM_STATE_COLORS[systemState] : '#666', [systemState]);
  const systemStateLabel = useMemo(() => systemState ? SYSTEM_STATE_LABELS[systemState] : 'UNKNOWN', [systemState]);
  const eventLabel = useMemo(() => EVENT_TYPE_LABELS[eventType] || eventType, [eventType]);
  const connectionLabel = useMemo(() => CONNECTION_STATUS_LABELS[connectionStatus], [connectionStatus]);
  const sourceLabel = useMemo(() => SOURCE_LABELS[currentSource] || currentSource, [currentSource]);
  const affectedZoneLabel = useMemo(() => getZoneName(affectedZoneMask), [affectedZoneMask]);

  if (!latestFrame) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-section">
          <h3>SIGAS-RT</h3>
          <div className="status-row">
            <span className="status-label">SYSTEM STATE</span>
            <span className="status-value waiting">WAITING FOR DATA</span>
          </div>
          <div className="status-row">
            <span className="status-label">SOURCE</span>
            <span className="status-value">{sourceLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">CONNECTION</span>
            <span className="status-value disconnected">{connectionLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <h2>SIGAS-RT</h2>
        <div className="source-badge">{sourceLabel}</div>
      </div>

      <div className="dashboard-section">
        <h3>SYSTEM STATE</h3>
        <div className="status-grid">
          <div className="status-row main-status">
            <span className="status-label">STATE</span>
            <span className="status-value" style={{ color: systemStateColor }}>{systemStateLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">EVENT</span>
            <span className="status-value warning">{eventLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">AFFECTED ZONE</span>
            <span className="status-value">{affectedZoneLabel || 'None'}</span>
          </div>
          <div className="status-row">
            <span className="status-label">SIM TIME</span>
            <span className="status-value mono">{latestFrame.simTime.toFixed(1)}s</span>
          </div>
          <div className="status-row">
            <span className="status-label">CONNECTION</span>
            <span className="status-value">{connectionLabel}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>GAS SENSORS</h3>
        <div className="sensor-grid">
          {gasData && Object.entries(gasData).map(([zone, data]) => (
            <div key={zone} className="sensor-card gas">
              <div className="sensor-header">
                <span className="sensor-name">{zone} — {getZoneLabel(zone)}</span>
                <span className={`sensor-level ${data.level.toLowerCase()}`}>{data.level}</span>
              </div>
              <div className="sensor-details">
                <div className="detail-row">
                  <span className="detail-label">ADC</span>
                  <span className="detail-value mono">{data.adc}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">VALID</span>
                  <span className={`detail-value ${data.valid ? 'valid' : 'invalid'}`}>{data.valid ? 'YES' : 'NO'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">SOURCE</span>
                  <span className="detail-value mono">{latestFrame.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>PRESSURE (mbar)</h3>
        <div className="sensor-grid pressure">
          {pressureData && Object.entries(pressureData).map(([sensor, value]) => (
            <div key={sensor} className="sensor-card pressure">
              <div className="sensor-header">
                <span className="sensor-name">{sensor}</span>
                <span className="sensor-value mono">{value.toFixed(2)}</span>
              </div>
              <PressureBar value={value} min={0} max={30} />
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>FLOW (L/min)</h3>
        <div className="sensor-grid">
          {flowData && Object.entries(flowData).map(([name, value]) => (
            <div key={name} className="sensor-card flow">
              <span className="sensor-name">{name.toUpperCase()}</span>
              <span className="sensor-value mono">{value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>VALVES</h3>
        <div className="valve-grid">
          {valveData && Object.entries(valveData).map(([valve, state]) => (
            <div key={valve} className={`valve-card ${state.toLowerCase()}`}>
              <div className="valve-header">
                <span className="valve-name">{valve}</span>
                <span className={`valve-state ${state.toLowerCase()}`}>{VALVE_STATE_LABELS[state] || state}</span>
              </div>
              {pressureData && (
                <div className="valve-pressures">
                  <div className="pressure-pair">
                    <span className="pressure-label">UP</span>
                    <span className="pressure-value mono">{getValveUpstream(valve, pressureData).toFixed(2)} mbar</span>
                  </div>
                  <div className="pressure-pair">
                    <span className="pressure-label">DOWN</span>
                    <span className="pressure-value mono">{getValveDownstream(valve, pressureData).toFixed(2)} mbar</span>
                  </div>
                  <div className="pressure-pair delta">
                    <span className="pressure-label">ΔP</span>
                    <span className="pressure-value mono">{getValveDelta(valve, pressureData).toFixed(2)} mbar</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>INDICATORS</h3>
        <div className="indicators-grid">
          <div className={`indicator ${buzzer ? 'active' : ''}`}>
            <span className="indicator-icon">🔊</span>
            <span className="indicator-label">BUZZER</span>
            <span className="indicator-state">{buzzer ? 'ON' : 'OFF'}</span>
          </div>
          <div className={`indicator ${greenLed ? 'active green' : ''}`}>
            <span className="indicator-icon">🟢</span>
            <span className="indicator-label">GREEN LED</span>
            <span className="indicator-state">{greenLed ? 'ON' : 'OFF'}</span>
          </div>
          <div className={`indicator ${redLed ? 'active red' : ''}`}>
            <span className="indicator-icon">🔴</span>
            <span className="indicator-label">RED LED</span>
            <span className="indicator-state">{redLed ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section dev-info">
        <h3>PERFORMANCE</h3>
        <div className="perf-grid">
          <div><span className="perf-label">FPS</span><span className="perf-value">{fps}</span></div>
          <div><span className="perf-label">Frame Time</span><span className="perf-value mono">{frameTime.toFixed(2)}ms</span></div>
          <div><span className="perf-label">Mode</span><span className="perf-value">{performanceMode}</span></div>
          <div><span className="perf-label">Frames</span><span className="perf-value">{latestFrame.sequence}</span></div>
        </div>
      </div>
    </div>
  );
}

function getZoneLabel(zone: string): string {
  switch (zone) {
    case 'Z1': return 'KITCHEN';
    case 'Z2': return 'TECHNICAL';
    case 'Z3': return 'LIVING';
    default: return zone;
  }
}

function getValveUpstream(valve: string, pressure: { P0: number; P1: number; PK: number; PL: number; PT: number }): number {
  switch (valve) {
    case 'VM': return pressure.P0 ?? 0;
    case 'VK': return pressure.P1 ?? 0;
    case 'VL': return pressure.P1 ?? 0;
    case 'VT': return pressure.P1 ?? 0;
    default: return 0;
  }
}

function getValveDownstream(valve: string, pressure: { P0: number; P1: number; PK: number; PL: number; PT: number }): number {
  switch (valve) {
    case 'VM': return pressure.P1 ?? 0;
    case 'VK': return pressure.PK ?? 0;
    case 'VL': return pressure.PL ?? 0;
    case 'VT': return pressure.PT ?? 0;
    default: return 0;
  }
}

function getValveDelta(valve: string, pressure: { P0: number; P1: number; PK: number; PL: number; PT: number }): number {
  return getValveUpstream(valve, pressure) - getValveDownstream(valve, pressure);
}

function PressureBar({ value, min, max }: { value: number; min: number; max: number }) {
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  let color = '#00cc66';
  if (value < min + (max - min) * 0.3) color = '#ff3333';
  else if (value < min + (max - min) * 0.6) color = '#ffaa00';

  return (
    <div className="pressure-bar">
      <div
        className="pressure-bar-fill"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}
