import type { TelemetryFrameV2, TelemetrySource, SystemState, EventType, ValveState, GasZone, PressureData, FlowData, ValveData } from '../telemetry';

type ScenarioName =
  | 'NORMAL'
  | 'GAS_LEAK_KITCHEN'
  | 'GAS_LEAK_TECHNICAL'
  | 'GAS_LEAK_LIVING'
  | 'PIPE_RUPTURE_LIVING'
  | 'FALSE_PRESSURE_SPIKE'
  | 'PRESSURE_SENSOR_FAILURE'
  | 'GAS_SENSOR_FAILURE_Z3'
  | 'MULTI_ZONE_LEAK'
  | 'FULL_DEMO';

interface ScenarioStep {
  time: number;
  duration: number;
  systemState: SystemState;
  eventType: EventType;
  affectedZoneMask: number;
  gas: Partial<{ Z1: Partial<GasZone>; Z2: Partial<GasZone>; Z3: Partial<GasZone> }>;
  pressure: Partial<PressureData>;
  flow: Partial<FlowData>;
  valves: Partial<ValveData>;
  buzzer: boolean;
  greenLed: boolean;
  redLed: boolean;
}

interface Scenario {
  name: ScenarioName;
  displayName: string;
  steps: ScenarioStep[];
  totalDuration: number;
  loop: boolean;
}

const BASE_PRESSURE: PressureData = { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 };
const BASE_FLOW: FlowData = { main: 5, living: 2 };
const BASE_VALVES: ValveData = { VM: 'OPEN', VK: 'OPEN', VL: 'OPEN', VT: 'OPEN' };
const BASE_GAS: { Z1: GasZone; Z2: GasZone; Z3: GasZone } = {
  Z1: { adc: 800, level: 'NORMAL', valid: true },
  Z2: { adc: 750, level: 'NORMAL', valid: true },
  Z3: { adc: 700, level: 'NORMAL', valid: true },
};

function createBaseFrame(overrides: Partial<TelemetryFrameV2> = {}): TelemetryFrameV2 {
  return {
    schemaVersion: 2,
    source: 'MOCK_SIM',
    sequence: 0,
    simTime: 0,
    timestamp: Date.now(),
    systemState: 'NORMAL',
    eventType: 'NONE',
    affectedZoneMask: 0,
    gas: BASE_GAS,
    pressure: BASE_PRESSURE,
    flow: BASE_FLOW,
    valves: BASE_VALVES,
    buzzer: false,
    greenLed: true,
    redLed: false,
    ...overrides,
  };
}

const scenarios: Record<ScenarioName, Scenario> = {
  NORMAL: {
    name: 'NORMAL',
    displayName: 'Normal Operation',
    totalDuration: 10,
    loop: true,
    steps: [
      { time: 0, duration: 10, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
    ],
  },

  GAS_LEAK_KITCHEN: {
    name: 'GAS_LEAK_KITCHEN',
    displayName: 'Gas Leak - Kitchen',
    totalDuration: 15,
    loop: false,
    steps: [
      { time: 0, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 3, duration: 4, systemState: 'WARNING', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 2800, level: 'WARNING', valid: true } }, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 7, duration: 5, systemState: 'CRITICAL', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 12, duration: 3, systemState: 'SAFE_LATCHED', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  GAS_LEAK_TECHNICAL: {
    name: 'GAS_LEAK_TECHNICAL',
    displayName: 'Gas Leak - Technical Area',
    totalDuration: 15,
    loop: false,
    steps: [
      { time: 0, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 3, duration: 4, systemState: 'WARNING', eventType: 'GAS_LEAK', affectedZoneMask: 2, gas: { Z2: { adc: 2900, level: 'WARNING', valid: true } }, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 7, duration: 5, systemState: 'CRITICAL', eventType: 'GAS_LEAK', affectedZoneMask: 2, gas: { Z2: { adc: 3900, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VT: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 12, duration: 3, systemState: 'SAFE_LATCHED', eventType: 'GAS_LEAK', affectedZoneMask: 2, gas: { Z2: { adc: 3900, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VT: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  GAS_LEAK_LIVING: {
    name: 'GAS_LEAK_LIVING',
    displayName: 'Gas Leak - Living Room',
    totalDuration: 15,
    loop: false,
    steps: [
      { time: 0, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 3, duration: 4, systemState: 'WARNING', eventType: 'GAS_LEAK', affectedZoneMask: 4, gas: { Z3: { adc: 3000, level: 'WARNING', valid: true } }, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 7, duration: 5, systemState: 'CRITICAL', eventType: 'GAS_LEAK', affectedZoneMask: 4, gas: { Z3: { adc: 4000, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 12, duration: 3, systemState: 'SAFE_LATCHED', eventType: 'GAS_LEAK', affectedZoneMask: 4, gas: { Z3: { adc: 4000, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  PIPE_RUPTURE_LIVING: {
    name: 'PIPE_RUPTURE_LIVING',
    displayName: 'Pipe Rupture - Living Room',
    totalDuration: 20,
    loop: false,
    steps: [
      { time: 0, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 2, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: { Z3: { adc: 1200, level: 'NORMAL', valid: true } }, pressure: { PL: 14 }, flow: { living: 3 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 4, duration: 3, systemState: 'WARNING', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 2500, level: 'WARNING', valid: true } }, pressure: { PL: 8 }, flow: { living: 8 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 7, duration: 4, systemState: 'CRITICAL', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: { PL: 3 }, flow: { living: 15 }, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 11, duration: 5, systemState: 'SAFE_LATCHED', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: { PL: 1 }, flow: { living: 0.5 }, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 16, duration: 4, systemState: 'SAFE_LATCHED', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 2000, level: 'WARNING', valid: true } }, pressure: { PL: 0.5 }, flow: { living: 0 }, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  FALSE_PRESSURE_SPIKE: {
    name: 'FALSE_PRESSURE_SPIKE',
    displayName: 'False Pressure Spike',
    totalDuration: 10,
    loop: false,
    steps: [
      { time: 0, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 2, duration: 3, systemState: 'WARNING', eventType: 'PRESSURE_ANOMALY', affectedZoneMask: 0, gas: {}, pressure: { P1: 35 }, flow: { main: 12 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 5, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: { P1: 18 }, flow: { main: 5 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 8, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
    ],
  },

  PRESSURE_SENSOR_FAILURE: {
    name: 'PRESSURE_SENSOR_FAILURE',
    displayName: 'Pressure Sensor Failure',
    totalDuration: 10,
    loop: false,
    steps: [
      { time: 0, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 3, duration: 4, systemState: 'FAULT', eventType: 'SENSOR_FAULT', affectedZoneMask: 0, gas: {}, pressure: { PL: 0 }, flow: {}, valves: {}, buzzer: true, greenLed: false, redLed: true },
      { time: 7, duration: 3, systemState: 'FAULT', eventType: 'SENSOR_FAULT', affectedZoneMask: 0, gas: {}, pressure: { PL: 0 }, flow: {}, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  GAS_SENSOR_FAILURE_Z3: {
    name: 'GAS_SENSOR_FAILURE_Z3',
    displayName: 'Gas Sensor Failure - Z3',
    totalDuration: 10,
    loop: false,
    steps: [
      { time: 0, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 3, duration: 4, systemState: 'FAULT', eventType: 'SENSOR_FAULT', affectedZoneMask: 4, gas: { Z3: { adc: 0, level: 'FAULT', valid: false } }, pressure: {}, flow: {}, valves: {}, buzzer: true, greenLed: false, redLed: true },
      { time: 7, duration: 3, systemState: 'FAULT', eventType: 'SENSOR_FAULT', affectedZoneMask: 4, gas: { Z3: { adc: 0, level: 'FAULT', valid: false } }, pressure: {}, flow: {}, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  MULTI_ZONE_LEAK: {
    name: 'MULTI_ZONE_LEAK',
    displayName: 'Multi-Zone Leak',
    totalDuration: 20,
    loop: false,
    steps: [
      { time: 0, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 2, duration: 3, systemState: 'WARNING', eventType: 'MULTI_ZONE', affectedZoneMask: 3, gas: { Z1: { adc: 2500, level: 'WARNING', valid: true }, Z2: { adc: 2400, level: 'WARNING', valid: true } }, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 5, duration: 5, systemState: 'CRITICAL', eventType: 'MULTI_ZONE', affectedZoneMask: 7, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true }, Z2: { adc: 3700, level: 'CRITICAL', valid: true }, Z3: { adc: 3500, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED', VT: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 10, duration: 5, systemState: 'SAFE_LATCHED', eventType: 'MULTI_ZONE', affectedZoneMask: 7, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true }, Z2: { adc: 3700, level: 'CRITICAL', valid: true }, Z3: { adc: 3500, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED', VT: 'CLOSED', VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 15, duration: 5, systemState: 'SAFE_LATCHED', eventType: 'MULTI_ZONE', affectedZoneMask: 7, gas: { Z1: { adc: 2000, level: 'WARNING', valid: true }, Z2: { adc: 1900, level: 'WARNING', valid: true }, Z3: { adc: 1800, level: 'WARNING', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED', VT: 'CLOSED', VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },

  FULL_DEMO: {
    name: 'FULL_DEMO',
    displayName: 'Full Demo Sequence',
    totalDuration: 45,
    loop: false,
    steps: [
      { time: 0, duration: 5, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 5, duration: 3, systemState: 'WARNING', eventType: 'PRESSURE_ANOMALY', affectedZoneMask: 0, gas: {}, pressure: { P1: 35 }, flow: { main: 12 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 8, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: { P1: 18 }, flow: { main: 5 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 10, duration: 5, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 15, duration: 3, systemState: 'WARNING', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 3200, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 18, duration: 4, systemState: 'CRITICAL', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 22, duration: 3, systemState: 'SAFE_LATCHED', eventType: 'GAS_LEAK', affectedZoneMask: 1, gas: { Z1: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 25, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: { Z1: { adc: 800, level: 'NORMAL', valid: true } }, pressure: {}, flow: {}, valves: { VK: 'OPEN' }, buzzer: false, greenLed: true, redLed: false },
      { time: 28, duration: 3, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: {}, pressure: {}, flow: {}, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 31, duration: 2, systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: { Z3: { adc: 1200, level: 'NORMAL', valid: true } }, pressure: { PL: 14 }, flow: { living: 3 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 33, duration: 3, systemState: 'WARNING', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 2500, level: 'WARNING', valid: true } }, pressure: { PL: 8 }, flow: { living: 8 }, valves: {}, buzzer: false, greenLed: true, redLed: false },
      { time: 36, duration: 4, systemState: 'CRITICAL', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: { PL: 3 }, flow: { living: 15 }, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
      { time: 40, duration: 5, systemState: 'SAFE_LATCHED', eventType: 'PIPE_RUPTURE', affectedZoneMask: 4, gas: { Z3: { adc: 3800, level: 'CRITICAL', valid: true } }, pressure: { PL: 1 }, flow: { living: 0.5 }, valves: { VL: 'CLOSED' }, buzzer: true, greenLed: false, redLed: true },
    ],
  },
};

export class MockSimulator {
  private currentScenario: ScenarioName = 'NORMAL';
  private scenarioStartTime = 0;
  private sequence = 0;
  private isRunning = false;
  private animationFrame: number | null = null;
  private onFrame: (frame: TelemetryFrameV2) => void;
  private timeScale = 1;

  constructor(onFrame: (frame: TelemetryFrameV2) => void) {
    this.onFrame = onFrame;
  }

  setScenario(name: ScenarioName) {
    this.currentScenario = name;
    this.scenarioStartTime = performance.now() / 1000;
  }

  setTimeScale(scale: number) {
    this.timeScale = Math.max(0.1, Math.min(4, scale));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scenarioStartTime = performance.now() / 1000;
    this.sequence = 0;
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private tick = () => {
    if (!this.isRunning) return;

    const now = performance.now() / 1000;
    const elapsed = (now - this.scenarioStartTime) * this.timeScale;
    const scenario = scenarios[this.currentScenario];

    let currentStep = scenario.steps[0];
    for (const step of scenario.steps) {
      if (elapsed >= step.time) {
        currentStep = step;
      } else {
        break;
      }
    }

    const progress = elapsed - currentStep.time;
    const stepProgress = Math.min(1, progress / currentStep.duration);

    const frame = this.interpolateFrame(currentStep, stepProgress, elapsed);
    frame.sequence = this.sequence++;
    frame.timestamp = Date.now();
    frame.simTime = elapsed;

    this.onFrame(frame);

    if (elapsed >= scenario.totalDuration) {
      if (scenario.loop) {
        this.scenarioStartTime = now;
        this.sequence = 0;
      } else {
        this.stop();
        return;
      }
    }

    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private interpolateFrame(step: ScenarioStep, progress: number, simTime: number): TelemetryFrameV2 {
    const base = createBaseFrame();

    const gas: TelemetryFrameV2['gas'] = {
      Z1: { ...BASE_GAS.Z1, ...step.gas.Z1 },
      Z2: { ...BASE_GAS.Z2, ...step.gas.Z2 },
      Z3: { ...BASE_GAS.Z3, ...step.gas.Z3 },
    };

    const pressure: PressureData = { ...BASE_PRESSURE, ...step.pressure };
    const flow: FlowData = { ...BASE_FLOW, ...step.flow };
    const valves: ValveData = { ...BASE_VALVES, ...step.valves };

    return {
      ...base,
      simTime,
      systemState: step.systemState,
      eventType: step.eventType,
      affectedZoneMask: step.affectedZoneMask,
      gas,
      pressure,
      flow,
      valves,
      buzzer: step.buzzer,
      greenLed: step.greenLed,
      redLed: step.redLed,
    };
  }

  getCurrentScenario(): ScenarioName {
    return this.currentScenario;
  }

  getAvailableScenarios(): Scenario[] {
    return Object.values(scenarios);
  }

  getScenarioInfo(name: ScenarioName): Scenario | undefined {
    return scenarios[name];
  }

  isScenarioRunning(): boolean {
    return this.isRunning;
  }

  getElapsedTime(): number {
    if (!this.isRunning) return 0;
    return (performance.now() / 1000 - this.scenarioStartTime) * this.timeScale;
  }

  getTotalDuration(): number {
    return scenarios[this.currentScenario].totalDuration;
  }
}

export function createMockSimulator(onFrame: (frame: TelemetryFrameV2) => void): MockSimulator {
  return new MockSimulator(onFrame);
}