import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { OFFLINE_STATUS, type MatlabStatus } from '../bridge/protocol';
import {
  type ValidatedTelemetry,
  type TelemetryFrameV2,
  type TelemetrySource,
  type ConnectionStatus,
  type SystemState,
  type ValveState,
  getConnectionStatus,
  CONNECTION_THRESHOLDS,
} from '../telemetry';

interface DigitalTwinState {
  matlab: MatlabStatus;
  setMatlabStatus: (status: MatlabStatus) => void;
  // Telemetry
  latestFrame: ValidatedTelemetry | null;
  previousFrame: ValidatedTelemetry | null;
  frameHistory: ValidatedTelemetry[];
  maxHistoryLength: number;

  // Connection
  lastValidFrameTime: number;
  connectionStatus: ConnectionStatus;

  // Source
  currentSource: TelemetrySource;

  // Replay
  isReplaying: boolean;
  replaySpeed: number;
  replayFrames: ValidatedTelemetry[];
  replayIndex: number;

  // Performance
  performanceMode: 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';
  fps: number;
  frameTime: number;

  // UI State
  selectedObject: string | null;
  activeView: 'CASA' | 'XRAY' | 'TUBERIAS' | 'PRESION' | 'SEGURIDAD';
  activeCameraPreset: string | null;
  showDevPanel: boolean;

  // Actions
  setTelemetryFrame: (frame: ValidatedTelemetry) => void;
  setSource: (source: TelemetrySource) => void;
  updateConnectionStatus: (now: number) => void;
  setReplayFrames: (frames: ValidatedTelemetry[]) => void;
  setReplaying: (playing: boolean) => void;
  setReplaySpeed: (speed: number) => void;
  setReplayIndex: (index: number) => void;
  tickReplay: () => void;
  setPerformanceMode: (mode: DigitalTwinState['performanceMode']) => void;
  updatePerformanceMetrics: (fps: number, frameTime: number) => void;
  selectObject: (objectId: string | null) => void;
  setActiveView: (view: DigitalTwinState['activeView']) => void;
  setActiveCameraPreset: (preset: string | null) => void;
  toggleDevPanel: () => void;
  reset: () => void;
}

const initialState: Omit<DigitalTwinState, 
  'setMatlabStatus' | 'setTelemetryFrame' | 'setSource' | 'updateConnectionStatus' |
  'setReplayFrames' | 'setReplaying' | 'setReplaySpeed' | 'setReplayIndex' | 
  'tickReplay' | 'setPerformanceMode' | 'updatePerformanceMetrics' | 
  'selectObject' | 'setActiveView' | 'setActiveCameraPreset' | 'toggleDevPanel' | 'reset'
> = {
  matlab: OFFLINE_STATUS,
  latestFrame: null,
  previousFrame: null,
  frameHistory: [],
  maxHistoryLength: 12000,
  lastValidFrameTime: 0,
  connectionStatus: 'DISCONNECTED',
  currentSource: 'MOCK_SIM',
  isReplaying: false,
  replaySpeed: 1,
  replayFrames: [],
  replayIndex: 0,
  performanceMode: 'AUTO',
  fps: 0,
  frameTime: 0,
  selectedObject: null,
  activeView: 'CASA',
  activeCameraPreset: null,
  showDevPanel: false,
};

export const useDigitalTwinStore = create<DigitalTwinState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    setMatlabStatus: (matlab) => {
      const changedRun = matlab.runId && matlab.runId !== get().matlab.runId;
      set(changedRun ? { matlab, latestFrame: null, previousFrame: null, frameHistory: [], lastValidFrameTime: 0, connectionStatus: 'DISCONNECTED' } : { matlab });
    },

    setTelemetryFrame: (frame) => {
      const { latestFrame, frameHistory, maxHistoryLength } = get();
      const sameRun = latestFrame?.runId === frame.runId;
      const newHistory = sameRun ? [...frameHistory] : [];
      if (latestFrame && sameRun) {
        newHistory.push(latestFrame);
        if (newHistory.length > maxHistoryLength) {
          newHistory.shift();
        }
      }
      set({
        previousFrame: sameRun ? latestFrame : null,
        latestFrame: frame,
        frameHistory: newHistory,
        lastValidFrameTime: frame._receivedAt,
        connectionStatus: getConnectionStatus(frame._receivedAt, performance.now()),
      });
    },

    setSource: (source) => set({ currentSource: source }),

    updateConnectionStatus: (now) => {
      const { lastValidFrameTime } = get();
      set({ connectionStatus: get().latestFrame ? getConnectionStatus(lastValidFrameTime, now) : 'DISCONNECTED' });
    },

    setReplayFrames: (frames) => set({ replayFrames: frames, replayIndex: 0 }),

    setReplaying: (playing) => set({ isReplaying: playing }),

    setReplaySpeed: (speed) => set({ replaySpeed: Math.max(0.1, Math.min(4, speed)) }),

    setReplayIndex: (index) => {
      const { replayFrames } = get();
      const clamped = Math.max(0, Math.min(replayFrames.length - 1, index));
      set({ replayIndex: clamped });
      if (replayFrames[clamped]) {
        get().setTelemetryFrame(replayFrames[clamped]);
      }
    },

    tickReplay: () => {
      const { isReplaying, replayFrames, replayIndex, replaySpeed, setReplayIndex, setReplaying } = get();
      if (!isReplaying || replayFrames.length === 0) return;
      const nextIndex = replayIndex + replaySpeed;
      if (nextIndex >= replayFrames.length - 1) {
        setReplayIndex(replayFrames.length - 1);
        setReplaying(false);
      } else {
        setReplayIndex(nextIndex);
      }
    },

    setPerformanceMode: (mode) => set({ performanceMode: mode }),

    updatePerformanceMetrics: (fps, frameTime) => set({ fps, frameTime }),

    selectObject: (objectId) => set({ selectedObject: objectId }),

    setActiveView: (view) => set((state) => ({
      activeView: view,
      // Returning to the exterior must not leave the camera inside the house.
      activeCameraPreset: view === 'CASA' ? 'EXTERIOR'
        : !state.activeCameraPreset || state.activeCameraPreset === 'EXTERIOR' ? 'XRAY'
        : state.activeCameraPreset,
    })),

    setActiveCameraPreset: (preset) => set((state) => ({
      activeCameraPreset: preset,
      // Interior presets need a cutaway, even when selected from CASA.
      // Keep pressure/safety/pipe inspection when moving between room cameras.
      activeView: preset === 'EXTERIOR' ? 'CASA'
        : preset === 'XRAY' || preset === 'VISTA_SUPERIOR' ? 'XRAY'
        : preset && state.activeView === 'CASA' ? 'XRAY'
        : state.activeView,
    })),

    toggleDevPanel: () => set((s) => ({ showDevPanel: !s.showDevPanel })),

    reset: () => set(initialState),
  }))
);

// Selectors for common derived state
export const selectLatestFrame = (state: DigitalTwinState) => state.latestFrame;
export const selectConnectionStatus = (state: DigitalTwinState) => state.connectionStatus;
export const selectCurrentSource = (state: DigitalTwinState) => state.currentSource;
export const selectSystemState = (state: DigitalTwinState): SystemState | null => state.latestFrame?.systemState ?? null;
export const selectEventType = (state: DigitalTwinState) => state.latestFrame?.eventType ?? 'NONE';
export const selectAffectedZoneMask = (state: DigitalTwinState) => state.latestFrame?.affectedZoneMask ?? 0;
export const selectGasData = (state: DigitalTwinState) => state.latestFrame?.gas ?? null;
export const selectPressureData = (state: DigitalTwinState) => state.latestFrame?.pressure ?? null;
export const selectFlowData = (state: DigitalTwinState) => state.latestFrame?.flow ?? null;
export const selectValveData = (state: DigitalTwinState) => state.latestFrame?.valves ?? null;
export const selectBuzzer = (state: DigitalTwinState) => state.latestFrame?.buzzer ?? false;
export const selectGreenLed = (state: DigitalTwinState) => state.latestFrame?.greenLed ?? false;
export const selectRedLed = (state: DigitalTwinState) => state.latestFrame?.redLed ?? false;
export const selectIsReplaying = (state: DigitalTwinState) => state.isReplaying;
export const selectReplaySpeed = (state: DigitalTwinState) => state.replaySpeed;
export const selectReplayProgress = (state: DigitalTwinState) =>
  state.replayFrames.length > 0 ? state.replayIndex / (state.replayFrames.length - 1) : 0;
export const selectPerformanceMode = (state: DigitalTwinState) => state.performanceMode;
export const selectFPS = (state: DigitalTwinState) => state.fps;
export const selectFrameTime = (state: DigitalTwinState) => state.frameTime;
export const selectSelectedObject = (state: DigitalTwinState) => state.selectedObject;
export const selectActiveView = (state: DigitalTwinState) => state.activeView;
export const selectActiveCameraPreset = (state: DigitalTwinState) => state.activeCameraPreset;
export const selectShowDevPanel = (state: DigitalTwinState) => state.showDevPanel;
export const selectFrameHistory = (state: DigitalTwinState) => state.frameHistory;
export const selectReplayFrames = (state: DigitalTwinState) => state.replayFrames;
export const selectReplayIndex = (state: DigitalTwinState) => state.replayIndex;
