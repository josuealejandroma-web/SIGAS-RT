import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
  'setTelemetryFrame' | 'setSource' | 'updateConnectionStatus' | 
  'setReplayFrames' | 'setReplaying' | 'setReplaySpeed' | 'setReplayIndex' | 
  'tickReplay' | 'setPerformanceMode' | 'updatePerformanceMetrics' | 
  'selectObject' | 'setActiveView' | 'setActiveCameraPreset' | 'toggleDevPanel' | 'reset'
> = {
  latestFrame: null,
  previousFrame: null,
  frameHistory: [],
  maxHistoryLength: 1800,
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

    setTelemetryFrame: (frame) => {
      const { latestFrame, frameHistory, maxHistoryLength } = get();
      const newHistory = [...frameHistory];
      if (latestFrame) {
        newHistory.push(latestFrame);
        if (newHistory.length > maxHistoryLength) {
          newHistory.shift();
        }
      }
      set({
        previousFrame: latestFrame,
        latestFrame: frame,
        frameHistory: newHistory,
        lastValidFrameTime: frame._receivedAt,
        connectionStatus: getConnectionStatus(frame._receivedAt, performance.now()),
      });
    },

    setSource: (source) => set({ currentSource: source }),

    updateConnectionStatus: (now) => {
      const { lastValidFrameTime } = get();
      set({ connectionStatus: getConnectionStatus(lastValidFrameTime, now) });
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

    setActiveView: (view) => set({ activeView: view }),

    setActiveCameraPreset: (preset) => set({ activeCameraPreset: preset }),

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