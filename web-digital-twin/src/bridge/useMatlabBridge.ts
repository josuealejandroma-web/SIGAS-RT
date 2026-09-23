import { useEffect } from 'react';

import { useDigitalTwinStore } from '../state/store';
import { validateTelemetryFrame } from '../telemetry/validator';
import { receivedAt } from './framePolicy';

import { OFFLINE_STATUS, PHASE_LABELS, type MatlabStatus } from './protocol';

export function matlabCommand(action: 'start' | 'stop' | 'run', scenario?: string) {
  window.dispatchEvent(new CustomEvent('matlab-command', { detail: { type: 'command', action, scenario } }));
}

type BridgeEnvelope = {
  type?: string;
  payload?: unknown;
};

export function useMatlabBridge(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const url = import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:45811';
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;
    const store = useDigitalTwinStore.getState();
    store.setSource('MATLAB_SIM');

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(url);

      socket.onmessage = event => {
        try {
          const envelope = JSON.parse(String(event.data)) as BridgeEnvelope;
          const state = useDigitalTwinStore.getState();
          if (envelope.type === 'status') {
            const status = envelope.payload as MatlabStatus;
            if (status && status.phase in PHASE_LABELS && typeof status.connected === 'boolean') state.setMatlabStatus(status);
            return;
          }
          if (envelope.type === 'error') {
            state.setMatlabStatus({ ...state.matlab, message: (envelope.payload as {message: string}).message });
            return;
          }
          if (!['telemetry', 'snapshot'].includes(envelope.type ?? '')) return;
          const frame = validateTelemetryFrame(envelope.payload);
          if (frame?.source === 'MATLAB_SIM') {
            frame._receivedAt = receivedAt(frame.timestamp, performance.now(), Date.now());
            if (frame.runId === state.matlab.runId) state.setTelemetryFrame(frame);
          }
        } catch {
          console.warn('[web/bridge] discarded malformed message');
        }
      };
      socket.onclose = () => {
        if (!stopped) useDigitalTwinStore.getState().setMatlabStatus({ ...OFFLINE_STATUS, message: 'Puente local desconectado; reconectando…' });
        if (!stopped) reconnectTimer = window.setTimeout(connect, 1000);
      };
      socket.onerror = () => socket?.close();
    };

    const command = (event: Event) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify((event as CustomEvent).detail));
    };
    window.addEventListener('matlab-command', command);
    connect();

    return () => {
      stopped = true;
      window.removeEventListener('matlab-command', command);
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [enabled]);
}
