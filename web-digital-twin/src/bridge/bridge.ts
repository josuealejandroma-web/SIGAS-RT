import type { TelemetryFrameV2 } from '../telemetry';

export interface BridgeConfig {
  udpPort: number;
  wsPort: number;
  mockMode: boolean;
}

export interface BridgeMessage {
  type: 'telemetry' | 'command' | 'status' | 'error';
  payload: unknown;
  timestamp: number;
}

export type BridgeEventHandler = (message: BridgeMessage) => void;

export class Bridge {
  private config: BridgeConfig;
  private wsServer: unknown = null;
  private udpSocket: unknown = null;
  private clients: Set<unknown> = new Set();
  private mockSimulator: unknown = null;
  private isRunning = false;
  private eventHandlers: BridgeEventHandler[] = [];

  constructor(config: Partial<BridgeConfig> = {}) {
    this.config = {
      udpPort: config.udpPort ?? 45810,
      wsPort: config.wsPort ?? 45811,
      mockMode: config.mockMode ?? false,
    };
  }

  addEventListener(handler: BridgeEventHandler) {
    this.eventHandlers.push(handler);
  }

  removeEventListener(handler: BridgeEventHandler) {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) this.eventHandlers.splice(index, 1);
  }

  private emit(message: BridgeMessage) {
    this.eventHandlers.forEach(h => h(message));
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.config.mockMode) {
      this.startMockMode();
    } else {
      await this.startRealMode();
    }

    this.emit({
      type: 'status',
      payload: { status: 'started', config: this.config },
      timestamp: Date.now(),
    });
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.mockSimulator) {
      // Stop mock simulator
    }

    if (this.udpSocket) {
      // Close UDP socket
    }

    if (this.wsServer) {
      // Close WebSocket server
    }

    this.clients.clear();

    this.emit({
      type: 'status',
      payload: { status: 'stopped' },
      timestamp: Date.now(),
    });
  }

  private startMockMode() {
    // Import and start mock simulator
    import('../scenarios/mockSimulator').then(({ createMockSimulator }) => {
      this.mockSimulator = createMockSimulator((frame: TelemetryFrameV2) => {
        this.broadcastTelemetry(frame);
      });
      (this.mockSimulator as { start: () => void }).start();
    });
  }

  private async startRealMode() {
    // TODO: Implement real UDP server and WebSocket server
    // This will be implemented when MATLAB integration is ready
    console.log('[Bridge] Real mode not yet implemented - MATLAB LIVE transport not enabled');
  }

  private broadcastTelemetry(frame: TelemetryFrameV2) {
    const message: BridgeMessage = {
      type: 'telemetry',
      payload: frame,
      timestamp: Date.now(),
    };

    this.emit(message);

    // Broadcast to WebSocket clients
    this.clients.forEach(client => {
      // Send to client
    });
  }

  sendCommand(command: string, params: Record<string, unknown>) {
    if (this.config.mockMode) {
      // Handle mock commands
      if (command === 'setScenario' && this.mockSimulator) {
        const mockSim = this.mockSimulator as { setScenario: (name: string) => void };
        mockSim.setScenario(params.scenario as string);
      } else if (command === 'setTimeScale' && this.mockSimulator) {
        const mockSim = this.mockSimulator as { setTimeScale: (scale: number) => void };
        mockSim.setTimeScale(params.scale as number);
      }
    } else {
      // Forward to MATLAB via UDP
      console.log('[Bridge] Command forwarding to MATLAB not yet implemented');
    }
  }

  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}

export function createBridge(config?: Partial<BridgeConfig>): Bridge {
  return new Bridge(config);
}