import { useDigitalTwinStore, selectActiveView, selectActiveCameraPreset, selectIsReplaying, selectReplaySpeed, selectReplayProgress, selectCurrentSource, selectPerformanceMode, selectFPS, selectFrameTime, selectLatestFrame } from '../state/store';
import { matlabCommand } from '../bridge/useMatlabBridge';
import { PHASE_LABELS } from '../bridge/protocol';
import { CAMERA_PRESETS } from '../scene/types';

const VIEWS = [
  { id: 'CASA', label: 'CASA', icon: '🏠' },
  { id: 'XRAY', label: 'XRAY', icon: '🔍' },
  { id: 'TUBERIAS', label: 'TUBERÍAS', icon: '🔧' },
  { id: 'PRESION', label: 'PRESIÓN', icon: '📊' },
  { id: 'SEGURIDAD', label: 'SEGURIDAD', icon: '🛡️' },
] as const;

export function ViewSelector() {
  const activeView = useDigitalTwinStore(selectActiveView);
  const setActiveView = useDigitalTwinStore(s => s.setActiveView);

  return (
    <div className="view-selector" role="tablist" aria-label="Vistas principales">
      {VIEWS.map(view => (
        <button
          key={view.id}
          role="tab"
          aria-selected={activeView === view.id}
          className={`view-tab ${activeView === view.id ? 'active' : ''}`}
          onClick={() => setActiveView(view.id as typeof activeView)}
          title={view.label}
        >
          <span className="view-icon">{view.icon}</span>
          <span className="view-label">{view.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CameraPresetSelector() {
  const activePreset = useDigitalTwinStore(selectActiveCameraPreset);
  const setActiveCameraPreset = useDigitalTwinStore(s => s.setActiveCameraPreset);

  return (
    <div className="camera-preset-selector">
      <select
        value={activePreset || ''}
        onChange={e => setActiveCameraPreset(e.target.value || null)}
        className="preset-select"
        aria-label="Presets de cámara"
      >
        <option value="">— Cámara —</option>
        {CAMERA_PRESETS.map(preset => (
          <option key={preset.name} value={preset.name}>
            {preset.name} — {preset.description}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ScenarioPanel() {
  const matlab = useDigitalTwinStore(s => s.matlab);
  const busy = ['starting', 'computing', 'playing'].includes(matlab.phase);
  const currentSource = useDigitalTwinStore(selectCurrentSource);
  const isReplaying = useDigitalTwinStore(selectIsReplaying);
  const replaySpeed = useDigitalTwinStore(selectReplaySpeed);
  const replayProgress = useDigitalTwinStore(selectReplayProgress);
  const setActiveView = useDigitalTwinStore(s => s.setActiveView);
  const setActiveCameraPreset = useDigitalTwinStore(s => s.setActiveCameraPreset);

  const scenarios = [
    { id: 'NORMAL', label: 'NORMAL', icon: '✅' },
    { id: 'GAS_LEAK_KITCHEN', label: 'FUGA COCINA', icon: '🍳' },
    { id: 'GAS_LEAK_TECHNICAL', label: 'FUGA TÉCNICA', icon: '🔧' },
    { id: 'GAS_LEAK_LIVING', label: 'FUGA LIVING', icon: '🛋️' },
    { id: 'PIPE_RUPTURE_LIVING', label: 'ROTURA LIVING', icon: '💥' },
    { id: 'PRESSURE_DROP_NO_GAS', label: 'CAÍDA SIN GAS', icon: '📉' },
    { id: 'FALSE_PRESSURE_SPIKE', label: 'FALSO PICO', icon: '📈' },
    { id: 'PRESSURE_SENSOR_FAILURE', label: 'FALLO PRESIÓN', icon: '📉' },
    { id: 'GAS_SENSOR_FAILURE_Z3', label: 'FALLO GAS Z3', icon: '🔴' },
    { id: 'MULTI_ZONE_LEAK', label: 'MULTIZONA', icon: '🌐' },
    { id: 'FULL_DEMO', label: 'DEMOSTRACIÓN COMPLETA', icon: '🎬' },
  ] as const;

  const limitation = matlab.scenario.includes('PIPE_RUPTURE') ? 'Limitación conocida: el modelo puede clasificar esta rotura como GAS_LEAK. No se fuerza el evento PIPE_RUPTURE.'
    : matlab.scenario.includes('PRESSURE_DROP') ? 'Caída de presión de rama sin señal de gas. No representa una caída de suministro. El controlador actual alarma sin cerrar válvulas.'
    : matlab.scenario.includes('FULL_DEMO') ? 'Secuencia de estímulos: el enclavamiento puede impedir el rearme automático; no se fuerzan aperturas.'
    : '';
  const handleScenarioClick = (scenarioId: string) => {
    if (currentSource === 'MOCK_SIM') {
      // This will be connected to the mock simulator
      window.dispatchEvent(new CustomEvent('mock-scenario-change', { detail: { scenario: scenarioId } }));
      return;
    }

    // Request only a predefined simulation stimulus; actuator states come
    // exclusively from the model's telemetry.
    if (currentSource !== 'MATLAB_SIM' || !matlab.connected || busy) return;
    matlabCommand('run', scenarioId);
    const visualScenario = {
      NORMAL: { view: 'CASA', camera: 'EXTERIOR' },
      GAS_LEAK_KITCHEN: { view: 'SEGURIDAD', camera: 'COCINA' },
      GAS_LEAK_TECHNICAL: { view: 'SEGURIDAD', camera: 'AREA_TECNICA' },
      GAS_LEAK_LIVING: { view: 'SEGURIDAD', camera: 'LIVING' },
      PIPE_RUPTURE_LIVING: { view: 'TUBERIAS', camera: 'LIVING' },
      PRESSURE_DROP_NO_GAS: { view: 'PRESION', camera: 'MANIFOLD_MEDIDOR' },
      FALSE_PRESSURE_SPIKE: { view: 'PRESION', camera: 'MANIFOLD_MEDIDOR' },
      PRESSURE_SENSOR_FAILURE: { view: 'PRESION', camera: 'MANIFOLD_MEDIDOR' },
      GAS_SENSOR_FAILURE_Z3: { view: 'SEGURIDAD', camera: 'LIVING' },
      MULTI_ZONE_LEAK: { view: 'XRAY', camera: 'VISTA_SUPERIOR' },
      FULL_DEMO: { view: 'XRAY', camera: 'XRAY' },
    } as const;
    const preset = visualScenario[scenarioId as keyof typeof visualScenario];
    if (preset) {
      setActiveView(preset.view);
      setActiveCameraPreset(preset.camera);
    }
  };

  return (
    <div className="scenario-panel">
      <div className="panel-header">
        <h3>ESCENARIOS</h3>
        <span className="source-indicator">{currentSource === 'MOCK_SIM' ? '🎮 CONTROL LOCAL' : '🔬 ESCENARIOS MATLAB'}</span>
      </div>

      {currentSource === 'MATLAB_SIM' && <div className="matlab-session">
        <p>{matlab.connected ? '● Sesión conectada' : '○ Sesión no disponible'} · {PHASE_LABELS[matlab.phase]}</p>
        <p>{matlab.scenario} {matlab.phase === 'completed' ? '· Resultado final; no es tiempo real continuo.' : ''}</p>
        {matlab.message && <p role="alert">{matlab.message}</p>}
        <button disabled={busy} onClick={() => matlabCommand(matlab.connected ? 'stop' : 'start')}>{matlab.connected ? 'Cerrar sesión MATLAB' : 'Conectar MATLAB'}</button>
        <p>El modelo calcula y después reproduce la telemetría. La sesión queda abierta para otra prueba.</p>
      </div>}
      {limitation && <p className="model-limitation" role="note">{limitation}</p>}
      <div className="scenario-grid">
        {scenarios.map(scenario => (
          <button
            key={scenario.id}
            className="scenario-btn"
            onClick={() => handleScenarioClick(scenario.id)}
            disabled={isReplaying || (currentSource === 'MATLAB_SIM' && (!matlab.connected || busy))}
            title={scenario.label}
          >
            <span className="scenario-icon">{scenario.icon}</span>
            <span className="scenario-label">{scenario.label}</span>
          </button>
        ))}
      </div>

      {isReplaying && (
        <div className="replay-indicator">
          <span className="replay-badge">▶ REPRODUCCIÓN {Math.round(replaySpeed * 10) / 10}x</span>
          <div className="replay-progress-bar">
            <div className="replay-progress-fill" style={{ width: `${replayProgress * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ReplayControls() {
  const isReplaying = useDigitalTwinStore(selectIsReplaying);
  const replaySpeed = useDigitalTwinStore(selectReplaySpeed);
  const replayProgress = useDigitalTwinStore(selectReplayProgress);
  const setReplaying = useDigitalTwinStore(s => s.setReplaying);
  const setReplaySpeed = useDigitalTwinStore(s => s.setReplaySpeed);
  const setReplayIndex = useDigitalTwinStore(s => s.setReplayIndex);
  const tickReplay = useDigitalTwinStore(s => s.tickReplay);

  const handlePlayPause = () => {
    setReplaying(!isReplaying);
  };

  const handleSpeedChange = (speed: number) => {
    setReplaySpeed(speed);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value) / 100;
    setReplayIndex(Math.round(progress * 1000)); // Will be clamped internally
  };

  return (
    <div className="replay-controls">
      <div className="replay-main">
        <button
          className={`replay-btn ${isReplaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
          aria-label={isReplaying ? 'Pausar' : 'Reproducir'}
        >
          {isReplaying ? '⏸' : '▶'}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={replayProgress * 100}
          onChange={handleSeek}
          className="replay-seek"
          aria-label="Posición de reproducción"
        />

        <div className="replay-speed">
          <select value={replaySpeed} onChange={e => handleSpeedChange(parseFloat(e.target.value))} className="speed-select">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      <div className="replay-time">
        <span>Progreso de reproducción: {Math.round(replayProgress * 100)}%</span>
      </div>
    </div>
  );
}

export function ConnectionStatus() {
  const matlab = useDigitalTwinStore(s => s.matlab);
  const connectionStatus = useDigitalTwinStore(s => s.connectionStatus);
  const currentSource = useDigitalTwinStore(selectCurrentSource);

  const statusConfig = {
    LIVE: { label: 'EN VIVO', className: 'live', icon: '🟢' },
    STALE: { label: 'DATOS ANTERIORES', className: 'stale', icon: '🟡' },
    DISCONNECTED: { label: 'DESCONECTADO', className: 'disconnected', icon: '🔴' },
  };

  const config = currentSource === 'MATLAB_SIM'
    ? { label: (matlab.connected ? 'CONECTADO · ' : '') + PHASE_LABELS[matlab.phase], className: matlab.connected ? 'live' : 'disconnected', icon: matlab.connected ? '🟢' : '🔴' }
    : statusConfig[connectionStatus];

  return (
    <div className={`connection-status ${config.className}`}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-text">{config.label}</span>
      <span className="source-text">{currentSource}</span>
    </div>
  );
}

export function PerformanceModeSelector() {
  const performanceMode = useDigitalTwinStore(selectPerformanceMode);
  const setPerformanceMode = useDigitalTwinStore(s => s.setPerformanceMode);

  const modes = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'] as const;

  return (
    <div className="perf-mode-selector">
      <select
        value={performanceMode}
        onChange={e => setPerformanceMode(e.target.value as typeof performanceMode)}
        className="mode-select"
        aria-label="Modo de rendimiento"
      >
        {modes.map(mode => (
          <option key={mode} value={mode}>{({ AUTO: 'AUTOMÁTICO', LOW: 'BAJO', MEDIUM: 'MEDIO', HIGH: 'ALTO' } as Record<string, string>)[mode]}</option>
        ))}
      </select>
    </div>
  );
}

export function DevPanel() {
  const showDevPanel = useDigitalTwinStore(s => s.showDevPanel);
  const toggleDevPanel = useDigitalTwinStore(s => s.toggleDevPanel);
  const fps = useDigitalTwinStore(selectFPS);
  const frameTime = useDigitalTwinStore(selectFrameTime);
  const performanceMode = useDigitalTwinStore(selectPerformanceMode);
  const connectionStatus = useDigitalTwinStore(s => s.connectionStatus);
  const currentSource = useDigitalTwinStore(selectCurrentSource);
  const latestFrame = useDigitalTwinStore(selectLatestFrame);

  if (!showDevPanel) {
    return (
      <button className="dev-toggle" onClick={toggleDevPanel} aria-label="Mostrar panel técnico">
        🛠
      </button>
    );
  }

  return (
    <div className="dev-panel">
      <div className="dev-header">
        <h4>PANEL TÉCNICO</h4>
        <button onClick={toggleDevPanel} aria-label="Cerrar panel técnico">✕</button>
      </div>
      <div className="dev-grid">
        <div><span>FPS</span><span className="mono">{fps}</span></div>
        <div><span>Tiempo de cuadro</span><span className="mono">{frameTime.toFixed(2)}ms</span></div>
        <div><span>Rendimiento</span><span>{performanceMode}</span></div>
        <div><span>Conexión</span><span>{connectionStatus}</span></div>
        <div><span>Fuente</span><span>{currentSource}</span></div>
        <div><span>Secuencia</span><span className="mono">{latestFrame?.sequence ?? '—'}</span></div>
        <div><span>Tiempo simulado</span><span className="mono">{latestFrame?.simTime.toFixed(1) ?? '—'}s</span></div>
        <div><span>Evento</span><span>{latestFrame?.eventType ?? '—'}</span></div>
        <div><span>Estado del sistema</span><span>{latestFrame?.systemState ?? '—'}</span></div>
      </div>
    </div>
  );
}
