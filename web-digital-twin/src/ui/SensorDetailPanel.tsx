import { useDigitalTwinStore, selectSelectedObject, selectLatestFrame } from '../state/store';
import { getZoneName, getValveUpstreamPressure, getValveDownstreamPressure, getValveDeltaPressure } from '../telemetry';

export function SensorDetailPanel() {
  const selectedObject = useDigitalTwinStore(selectSelectedObject);
  const latestFrame = useDigitalTwinStore(selectLatestFrame);

  if (!selectedObject || !latestFrame) return null;

  const isGasSensor = selectedObject.startsWith('SIGAS_MQ2') || selectedObject.startsWith('GS');
  const isPressureSensor = selectedObject.startsWith('SIGAS_P') || selectedObject.match(/^P[0-9KLT]$/);
  const isValve = selectedObject.startsWith('SIGAS_V') || selectedObject.match(/^V[MKLT]$/);

  if (isGasSensor) {
    const zone = selectedObject.includes('Z1') || selectedObject.includes('GS1') ? 'Z1' :
      selectedObject.includes('Z2') || selectedObject.includes('GS2') ? 'Z2' : 'Z3';
    const gasData = latestFrame.gas[zone as keyof typeof latestFrame.gas];

    return (
      <div className="detail-panel gas-sensor">
        <div className="panel-header">
          <h3>{selectedObject} — {getZoneLabel(zone)}</h3>
          <button className="close-btn" onClick={() => useDigitalTwinStore.getState().selectObject(null)}>✕</button>
        </div>
        <div className="panel-content">
          <div className="detail-row">
            <span className="label">Tipo:</span>
            <span className="value">Gas Sensor</span>
          </div>
          <div className="detail-row">
            <span className="label">Variable:</span>
            <span className="value">Gas combustible</span>
          </div>
          <div className="detail-row highlight">
            <span className="label">ADC:</span>
            <span className="value mono">{gasData.adc}</span>
          </div>
          <div className="detail-row highlight">
            <span className="label">Nivel:</span>
            <span className={`value level-${gasData.level.toLowerCase()}`}>{gasData.level}</span>
          </div>
          <div className="detail-row">
            <span className="label">Simulated proxy:</span>
            <span className="value mono">{getProxyDescription(gasData.adc)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Estado:</span>
            <span className={`value ${gasData.valid ? 'valid' : 'invalid'}`}>{gasData.valid ? 'VALID' : 'INVALID'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Freshness:</span>
            <span className="value">{getFreshnessLabel(latestFrame)}</span>
          </div>
          <div className="disclaimer">
            <strong>NOTA:</strong> Valores simulados. No representan mediciones certificadas.
          </div>
        </div>
      </div>
    );
  }

  if (isPressureSensor) {
    const sensorId = selectedObject.replace('SIGAS_', '').replace('SIGAS', '');
    const pressure = latestFrame.pressure[sensorId as keyof typeof latestFrame.pressure];

    return (
      <div className="detail-panel pressure-sensor">
        <div className="panel-header">
          <h3>{selectedObject} — {sensorId}</h3>
          <button className="close-btn" onClick={() => useDigitalTwinStore.getState().selectObject(null)}>✕</button>
        </div>
        <div className="panel-content">
          <div className="detail-row">
            <span className="label">Pressure:</span>
            <span className="value mono">{pressure?.toFixed(2) ?? '—'} mbar</span>
          </div>
          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`value ${getPressureStatus(pressure)}`}>{getPressureStatus(pressure)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Zone:</span>
            <span className="value">{getPressureZone(sensorId)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Last update:</span>
            <span className="value mono">{latestFrame.simTime.toFixed(1)}s</span>
          </div>
          <div className="detail-row">
            <span className="label">Source:</span>
            <span className="value mono">{latestFrame.source}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isValve) {
    const valveId = selectedObject.replace('SIGAS_', '').replace('SIGAS', '');
    const valveState = latestFrame.valves[valveId as keyof typeof latestFrame.valves];
    const upstream = getValveUpstreamPressure(valveId as keyof typeof latestFrame.valves, latestFrame.pressure);
    const downstream = getValveDownstreamPressure(valveId as keyof typeof latestFrame.valves, latestFrame.pressure);
    const delta = getValveDeltaPressure(valveId as keyof typeof latestFrame.valves, latestFrame.pressure);

    return (
      <div className="detail-panel valve">
        <div className="panel-header">
          <h3>{selectedObject} — {valveId}</h3>
          <button className="close-btn" onClick={() => useDigitalTwinStore.getState().selectObject(null)}>✕</button>
        </div>
        <div className="panel-content">
          <div className="detail-row highlight">
            <span className="label">STATE:</span>
            <span className={`value valve-${valveState?.toLowerCase()}`}>{valveState}</span>
          </div>
          <div className="detail-row">
            <span className="label">UPSTREAM:</span>
            <span className="value mono">P? = {upstream.toFixed(2)} mbar</span>
          </div>
          <div className="detail-row">
            <span className="label">DOWNSTREAM:</span>
            <span className="value mono">P? = {downstream.toFixed(2)} mbar</span>
          </div>
          <div className="detail-row highlight">
            <span className="label">DELTA:</span>
            <span className="value mono">{delta.toFixed(2)} mbar</span>
          </div>
          <div className="detail-row">
            <span className="label">REASON:</span>
            <span className="value">{latestFrame.eventType}</span>
          </div>
          <div className="detail-row">
            <span className="label">AFFECTED ZONE:</span>
            <span className="value">{getZoneName(latestFrame.affectedZoneMask)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-panel generic">
      <div className="panel-header">
        <h3>{selectedObject}</h3>
        <button className="close-btn" onClick={() => useDigitalTwinStore.getState().selectObject(null)}>✕</button>
      </div>
      <div className="panel-content">
        <p>No detailed information available for this object.</p>
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

function getProxyDescription(adc: number): string {
  if (adc < 1500) return '~0-50 ppm (aire limpio)';
  if (adc < 2500) return '~50-200 ppm (traza)';
  if (adc < 3500) return '~200-500 ppm (advertencia)';
  return '>500 ppm (crítico)';
}

function getFreshnessLabel(frame: { timestamp: number; source: string }): string {
  const age = Date.now() - frame.timestamp;
  if (age < 1500) return `LIVE (${frame.source})`;
  if (age < 3000) return `STALE (${frame.source})`;
  return `DISCONNECTED (${frame.source})`;
}

function getPressureStatus(pressure: number | undefined): string {
  if (pressure === undefined) return 'UNKNOWN';
  if (pressure < 5) return 'LOW';
  if (pressure < 15) return 'NOMINAL';
  if (pressure < 25) return 'HIGH';
  return 'CRITICAL';
}

function getPressureZone(sensorId: string): string {
  switch (sensorId) {
    case 'P0': return 'SUPPLY';
    case 'P1': return 'MANIFOLD';
    case 'PK': return 'KITCHEN';
    case 'PL': return 'LIVING';
    case 'PT': return 'TECHNICAL';
    default: return sensorId;
  }
}