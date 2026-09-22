import { useEffect } from 'react';

import { useDigitalTwinStore } from '../state/store';
import { validateTelemetryFrame } from '../telemetry/validator';

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
          if (envelope.type !== 'telemetry') return;
          const frame = validateTelemetryFrame(envelope.payload);
          if (frame?.source === 'MATLAB_SIM') {
            useDigitalTwinStore.getState().setTelemetryFrame(frame);
          }
        } catch {
          console.warn('[web/bridge] discarded malformed message');
        }
      };
      socket.onclose = () => {
        if (!stopped) reconnectTimer = window.setTimeout(connect, 1000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [enabled]);
}
