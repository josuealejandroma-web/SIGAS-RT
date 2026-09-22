import { useEffect, useRef, useCallback } from 'react';
import { Scene3D } from './scene/Scene3D';
import { Dashboard } from './ui/Dashboard';
import { ViewSelector, CameraPresetSelector, ScenarioPanel, ReplayControls, ConnectionStatus, PerformanceModeSelector, DevPanel } from './ui/Panels';
import { LiveCharts } from './ui/Charts';
import { SensorDetailPanel } from './ui/SensorDetailPanel';
import { Timeline } from './ui/Timeline';
import { useDigitalTwinStore } from './state/store';
import { validateTelemetryFrame } from './telemetry/validator';
import { createMockSimulator } from './scenarios/mockSimulator';
import { createReplayPlayer } from './replay/replayManager';
import { useMatlabBridge } from './bridge/useMatlabBridge';
import './App.css';

function App() {
  const mockSimulatorRef = useRef<ReturnType<typeof createMockSimulator> | null>(null);
  const replayPlayerRef = useRef<ReturnType<typeof createReplayPlayer> | null>(null);
  const matlabMode = import.meta.env.VITE_FORCE_SOURCE === 'MATLAB_SIM';
  useMatlabBridge(matlabMode);
  const connectionCheckIntervalRef = useRef<number | null>(null);
  const performanceIntervalRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const handleTelemetryFrame = useCallback((frame: unknown) => {
    const validated = validateTelemetryFrame(frame);
    if (validated) {
      useDigitalTwinStore.getState().setTelemetryFrame(validated);
      lastFrameTimeRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (!matlabMode) {
      mockSimulatorRef.current = createMockSimulator(handleTelemetryFrame);
      mockSimulatorRef.current.setScenario('NORMAL');
      mockSimulatorRef.current.start();
    }

    replayPlayerRef.current = createReplayPlayer(
      (frame, index, total) => {
        useDigitalTwinStore.getState().setTelemetryFrame(frame);
        useDigitalTwinStore.getState().setReplayIndex(index);
      },
      () => {
        useDigitalTwinStore.getState().setReplaying(false);
      }
    );

    connectionCheckIntervalRef.current = window.setInterval(() => {
      useDigitalTwinStore.getState().updateConnectionStatus(performance.now());
    }, 500);

    performanceIntervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const fps = lastFrameTimeRef.current > 0 ? 1000 / (now - lastFrameTimeRef.current) : 0;
      useDigitalTwinStore.getState().updatePerformanceMetrics(Math.round(fps), now - lastFrameTimeRef.current);
      lastFrameTimeRef.current = now;
    }, 1000);

    const handleScenarioChange = (e: CustomEvent) => {
      if (mockSimulatorRef.current) {
        mockSimulatorRef.current.setScenario(e.detail.scenario as any);
      }
    };
    window.addEventListener('mock-scenario-change', handleScenarioChange as EventListener);

    const handleReplayTick = () => {
      if (useDigitalTwinStore.getState().isReplaying) {
        useDigitalTwinStore.getState().tickReplay();
      }
    };
    const replayTickInterval = window.setInterval(handleReplayTick, 50);

    return () => {
      mockSimulatorRef.current?.stop();
      replayPlayerRef.current?.stop();
      if (connectionCheckIntervalRef.current) clearInterval(connectionCheckIntervalRef.current);
      if (performanceIntervalRef.current) clearInterval(performanceIntervalRef.current);
      clearInterval(replayTickInterval);
      window.removeEventListener('mock-scenario-change', handleScenarioChange as EventListener);
    };
  }, [handleTelemetryFrame, matlabMode]);

  const handleObjectClick = useCallback((objectName: string) => {
    useDigitalTwinStore.getState().selectObject(objectName);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>SIGAS-RT</h1>
          <span className="subtitle">WEB DIGITAL TWIN</span>
        </div>
        <div className="header-center">
          <ViewSelector />
        </div>
        <div className="header-right">
          <CameraPresetSelector />
          <ConnectionStatus />
          <PerformanceModeSelector />
          <DevPanel />
        </div>
      </header>

      <main className="app-main">
        <div className="scene-container">
          <Scene3D
            onObjectClick={handleObjectClick}
            onSceneReady={app => {
              // App is ready
            }}
          />
          <SensorDetailPanel />
        </div>

        <aside className="sidebar">
          <Dashboard />
          <ScenarioPanel />
          <ReplayControls />
          <LiveCharts />
          <Timeline />
        </aside>
      </main>

      <footer className="app-footer">
        <div className="footer-left">
          <span>SIGAS-RT Web Digital Twin — {matlabMode ? 'MATLAB STREAM' : 'MOCK DEMO'}</span>
        </div>
        <div className="footer-right">
          <span>Renderer: WebGPU/WebGL2</span>
          <span>|</span>
          <span>PlayCanvas + React</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
