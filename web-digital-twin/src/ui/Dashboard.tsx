import { useDigitalTwinStore, selectLatestFrame, selectConnectionStatus, selectCurrentSource, selectSystemState, selectEventType, selectAffectedZoneMask, selectGasData, selectPressureData, selectFlowData, selectValveData, selectBuzzer, selectGreenLed, selectRedLed, selectPerformanceMode, selectFPS, selectFrameTime } from '../state/store';
import { SYSTEM_STATE_COLORS, SYSTEM_STATE_LABELS, EVENT_TYPE_LABELS, CONNECTION_STATUS_LABELS, SOURCE_LABELS, VALVE_STATE_LABELS } from '../scene/types';
import { getZoneName } from '../telemetry';
import { PHASE_LABELS } from '../bridge/protocol';
import { useMemo } from 'react';

export function Dashboard() {
  const matlab = useDigitalTwinStore(s => s.matlab);
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
  const systemStateLabel = useMemo(() => systemState ? SYSTEM_STATE_LABELS[systemState] : 'DESCONOCIDO', [systemState]);
  const eventLabel = useMemo(() => EVENT_TYPE_LABELS[eventType] || eventType, [eventType]);
  const connectionLabel = currentSource === 'MATLAB_SIM' ? `${matlab.connected ? 'Sesión conectada · ' : ''}${PHASE_LABELS[matlab.phase]}` : CONNECTION_STATUS_LABELS[connectionStatus];
  const sourceLabel = useMemo(() => SOURCE_LABELS[currentSource] || currentSource, [currentSource]);
  const affectedZoneLabel = useMemo(() => getZoneName(affectedZoneMask), [affectedZoneMask]);

  if (!latestFrame) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-section">
          <h3>SIGAS-RT</h3>
          <div className="status-row">
            <span className="status-label">ESTADO DEL SISTEMA</span>
            <span className="status-value waiting">ESPERANDO DATOS</span>
          </div>
          <div className="status-row">
            <span className="status-label">FUENTE</span>
            <span className="status-value">{sourceLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">CONEXIÓN</span>
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
        <h3>ESTADO DEL SISTEMA</h3>
        <div className="status-grid">
          <div className="status-row main-status">
            <span className="status-label">ESTADO</span>
            <span className="status-value" style={{ color: systemStateColor }}>{systemStateLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">EVENTO</span>
            <span className="status-value warning">{eventLabel}</span>
          </div>
          <div className="status-row">
            <span className="status-label">ZONA AFECTADA</span>
            <span className="status-value">{affectedZoneLabel || 'Ninguna'}</span>
          </div>
          <div className="status-row">
            <span className="status-label">TIEMPO SIMULADO</span>
            <span className="status-value mono">{latestFrame.simTime.toFixed(1)}s</span>
          </div>
          <div className="status-row">
            <span className="status-label">CONEXIÓN</span>
            <span className="status-value">{connectionLabel}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>SENSORES DE GAS</h3>
        <div className="sensor-grid">
          {gasData && Object.entries(gasData).map(([zone, data]) => (
            <div key={zone} className="sensor-card gas">
              <div className="sensor-header">
                <span className="sensor-name">{zone} — {getZoneLabel(zone)}</span>
                <span className={`sensor-level ${data.level.toLowerCase()}`}>{gasLevelLabel(data.level)}</span>
              </div>
              <div className="sensor-details">
                <div className="detail-row">
                  <span className="detail-label">ADC</span>
                  <span className="detail-value mono">{data.adc}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">VÁLIDO</span>
                  <span className={`detail-value ${data.valid ? 'valid' : 'invalid'}`}>{data.valid ? 'SÍ' : 'NO'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">FUENTE</span>
                  <span className="detail-value mono">{latestFrame.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>PRESIÓN (mbar)</h3>
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
        <h3>CAUDAL ({latestFrame.flowUnit ?? (latestFrame.source === 'MATLAB_SIM' ? 'kg/s' : 'L/min')})</h3>
        <div className="sensor-grid">
          {flowData && Object.entries(flowData).map(([name, value]) => (
            <div key={name} className="sensor-card flow">
              <span className="sensor-name">{flowLabel(name)}</span>
              <span className="sensor-value mono">{value.toPrecision(3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h3>VÁLVULAS</h3>
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
                    <span className="pressure-label">ARRIBA</span>
                    <span className="pressure-value mono">{getValveUpstream(valve, pressureData).toFixed(2)} mbar</span>
                  </div>
                  <div className="pressure-pair">
                    <span className="pressure-label">ABAJO</span>
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
        <h3>INDICADORES</h3>
        <div className="indicators-grid">
          <div className={`indicator ${buzzer ? 'active' : ''}`}>
            <span className="indicator-icon">🔊</span>
            <span className="indicator-label">ZUMBADOR</span>
            <span className="indicator-state">{buzzer ? 'ENCENDIDO' : 'APAGADO'}</span>
          </div>
          <div className={`indicator ${greenLed ? 'active green' : ''}`}>
            <span className="indicator-icon">🟢</span>
            <span className="indicator-label">LED VERDE</span>
            <span className="indicator-state">{greenLed ? 'ENCENDIDO' : 'APAGADO'}</span>
          </div>
          <div className={`indicator ${redLed ? 'active red' : ''}`}>
            <span className="indicator-icon">🔴</span>
            <span className="indicator-label">LED ROJO</span>
            <span className="indicator-state">{redLed ? 'ENCENDIDO' : 'APAGADO'}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section dev-info">
        <h3>RENDIMIENTO</h3>
        <div className="perf-grid">
          <div><span className="perf-label">FPS</span><span className="perf-value">{fps}</span></div>
          <div><span className="perf-label">Tiempo de cuadro</span><span className="perf-value mono">{frameTime.toFixed(2)}ms</span></div>
          <div><span className="perf-label">Modo</span><span className="perf-value">{performanceModeLabel(performanceMode)}</span></div>
          <div><span className="perf-label">Muestras</span><span className="perf-value">{latestFrame.sequence}</span></div>
        </div>
      </div>
    </div>
  );
}

function getZoneLabel(zone: string): string {
  switch (zone) {
    case 'Z1': return 'COCINA';
    case 'Z2': return 'ÁREA TÉCNICA';
    case 'Z3': return 'LIVING';
    default: return zone;
  }
}

function gasLevelLabel(level: string): string {
  return ({ NORMAL: 'NORMAL', WARNING: 'ADVERTENCIA', CRITICAL: 'CRÍTICO', FAULT: 'FALLO' } as Record<string, string>)[level] ?? level;
}

function performanceModeLabel(mode: string): string {
  return ({ AUTO: 'AUTOMÁTICO', LOW: 'BAJO', MEDIUM: 'MEDIO', HIGH: 'ALTO' } as Record<string, string>)[mode] ?? mode;
}

function flowLabel(name: string): string {
  return ({ main: 'PRINCIPAL', living: 'LIVING' } as Record<string, string>)[name.toLowerCase()] ?? name.toUpperCase();
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
  if (value < 12 || value > 40) color = '#ff3333';
  else if (value > 30) color = '#ffaa00';

  return (
    <div className="pressure-bar">
      <div
        className="pressure-bar-fill"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}
