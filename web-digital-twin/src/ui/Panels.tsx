import { useDigitalTwinStore, selectActiveView, selectActiveCameraPreset, selectIsReplaying, selectReplaySpeed, selectReplayProgress, selectCurrentSource, selectPerformanceMode, selectFPS, selectFrameTime, selectLatestFrame } from '../state/store';
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
  const currentSource = useDigitalTwinStore(selectCurrentSource);
  const isReplaying = useDigitalTwinStore(selectIsReplaying);
  const replaySpeed = useDigitalTwinStore(selectReplaySpeed);
  const replayProgress = useDigitalTwinStore(selectReplayProgress);

  const scenarios = [
    { id: 'NORMAL', label: 'NORMAL', icon: '✅' },
    { id: 'GAS_LEAK_KITCHEN', label: 'FUGA COCINA', icon: '🍳' },
    { id: 'GAS_LEAK_TECHNICAL', label: 'FUGA TÉCNICA', icon: '🔧' },
    { id: 'GAS_LEAK_LIVING', label: 'FUGA LIVING', icon: '🛋️' },
    { id: 'PIPE_RUPTURE_LIVING', label: 'ROTURA LIVING', icon: '💥' },
    { id: 'FALSE_PRESSURE_SPIKE', label: 'FALSO PICO', icon: '📈' },
    { id: 'PRESSURE_SENSOR_FAILURE', label: 'FALLO PRESIÓN', icon: '📉' },
    { id: 'GAS_SENSOR_FAILURE_Z3', label: 'FALLO GAS Z3', icon: '🔴' },
    { id: 'MULTI_ZONE_LEAK', label: 'MULTIZONA', icon: '🌐' },
    { id: 'FULL_DEMO', label: 'FULL DEMO', icon: '🎬' },
  ] as const;

  const handleScenarioClick = (scenarioId: string) => {
    if (currentSource === 'MOCK_SIM') {
      // This will be connected to the mock simulator
      window.dispatchEvent(new CustomEvent('mock-scenario-change', { detail: { scenario: scenarioId } }));
    }
  };

  return (
    <div className="scenario-panel">
      <div className="panel-header">
        <h3>ESCENARIOS</h3>
        <span className="source-indicator">{currentSource === 'MOCK_SIM' ? '🎮 CONTROL LOCAL' : '🔬 CONTROLLED BY MATLAB'}</span>
      </div>

      <div className="scenario-grid">
        {scenarios.map(scenario => (
          <button
            key={scenario.id}
            className="scenario-btn"
            onClick={() => handleScenarioClick(scenario.id)}
            disabled={currentSource !== 'MOCK_SIM' || isReplaying}
            title={scenario.label}
          >
            <span className="scenario-icon">{scenario.icon}</span>
            <span className="scenario-label">{scenario.label}</span>
          </button>
        ))}
      </div>

      {isReplaying && (
        <div className="replay-indicator">
          <span className="replay-badge">▶ REPLAY {Math.round(replaySpeed * 10) / 10}x</span>
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
          aria-label={isReplaying ? 'Pause' : 'Play'}
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
          aria-label="Posición de replay"
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
        <span>Replay Progress: {Math.round(replayProgress * 100)}%</span>
      </div>
    </div>
  );
}

export function ConnectionStatus() {
  const connectionStatus = useDigitalTwinStore(s => s.connectionStatus);
  const currentSource = useDigitalTwinStore(selectCurrentSource);

  const statusConfig = {
    LIVE: { label: 'LIVE', className: 'live', icon: '🟢' },
    STALE: { label: 'STALE', className: 'stale', icon: '🟡' },
    DISCONNECTED: { label: 'DISCONNECTED', className: 'disconnected', icon: '🔴' },
  };

  const config = statusConfig[connectionStatus];

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
          <option key={mode} value={mode}>{mode}</option>
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
      <button className="dev-toggle" onClick={toggleDevPanel} aria-label="Show dev panel">
        🛠
      </button>
    );
  }

  return (
    <div className="dev-panel">
      <div className="dev-header">
        <h4>DEV PANEL</h4>
        <button onClick={toggleDevPanel} aria-label="Close dev panel">✕</button>
      </div>
      <div className="dev-grid">
        <div><span>FPS</span><span className="mono">{fps}</span></div>
        <div><span>Frame Time</span><span className="mono">{frameTime.toFixed(2)}ms</span></div>
        <div><span>Performance</span><span>{performanceMode}</span></div>
        <div><span>Connection</span><span>{connectionStatus}</span></div>
        <div><span>Source</span><span>{currentSource}</span></div>
        <div><span>Sequence</span><span className="mono">{latestFrame?.sequence ?? '—'}</span></div>
        <div><span>Sim Time</span><span className="mono">{latestFrame?.simTime.toFixed(1) ?? '—'}s</span></div>
        <div><span>Event</span><span>{latestFrame?.eventType ?? '—'}</span></div>
        <div><span>System State</span><span>{latestFrame?.systemState ?? '—'}</span></div>
      </div>
    </div>
  );
}