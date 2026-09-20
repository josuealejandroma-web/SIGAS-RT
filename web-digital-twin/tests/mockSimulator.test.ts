import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSimulator } from '../src/scenarios/mockSimulator';
import { validateTelemetryFrame } from '../src/telemetry/validator';
import { createReplayPlayer } from '../src/replay/replayManager';
import type { ValidatedTelemetry } from '../src/telemetry/types';

describe('Mock Simulator', () => {
    let receivedFrames: any[] = [];

    beforeEach(() => {
        receivedFrames = [];
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should generate frames for NORMAL scenario', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('NORMAL');
        simulator.start();

        vi.advanceTimersByTime(100);

        expect(receivedFrames.length).toBeGreaterThan(0);
        const frame = receivedFrames[0];
        expect(frame.schemaVersion).toBe(2);
        expect(frame.source).toBe('MOCK_SIM');
        expect(frame.systemState).toBe('NORMAL');
        expect(frame.eventType).toBe('NONE');

        simulator.stop();
    });

    it('should generate frames for GAS_LEAK_KITCHEN scenario', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('GAS_LEAK_KITCHEN');
        simulator.start();

        vi.advanceTimersByTime(16000);

        const states = new Set(receivedFrames.map(f => f.systemState));
        expect(states.has('NORMAL')).toBe(true);
        expect(states.has('WARNING')).toBe(true);
        expect(states.has('CRITICAL')).toBe(true);
        expect(states.has('SAFE_LATCHED')).toBe(true);

        const events = new Set(receivedFrames.map(f => f.eventType));
        expect(events.has('GAS_LEAK')).toBe(true);

        const zones = new Set(receivedFrames.map(f => f.affectedZoneMask));
        expect(zones.has(1)).toBe(true);

        simulator.stop();
    });

    it('should generate frames for PIPE_RUPTURE_LIVING scenario', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('PIPE_RUPTURE_LIVING');
        simulator.start();

        vi.advanceTimersByTime(21000);

        const states = new Set(receivedFrames.map(f => f.systemState));
        expect(states.has('NORMAL')).toBe(true);
        expect(states.has('WARNING')).toBe(true);
        expect(states.has('CRITICAL')).toBe(true);
        expect(states.has('SAFE_LATCHED')).toBe(true);

        const events = new Set(receivedFrames.map(f => f.eventType));
        expect(events.has('PIPE_RUPTURE')).toBe(true);

        const plFrames = receivedFrames.filter(f => f.pressure.PL < 5);
        expect(plFrames.length).toBeGreaterThan(0);

        const highFlowFrames = receivedFrames.filter(f => f.flow.living > 10);
        expect(highFlowFrames.length).toBeGreaterThan(0);

        const closedFrames = receivedFrames.filter(f => f.valves.VL === 'CLOSED');
        expect(closedFrames.length).toBeGreaterThan(0);

        simulator.stop();
    });

    it('should generate frames for FULL_DEMO scenario', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('FULL_DEMO');
        simulator.start();

        vi.advanceTimersByTime(46000);

        const states = new Set(receivedFrames.map(f => f.systemState));
        expect(states.has('NORMAL')).toBe(true);
        expect(states.has('WARNING')).toBe(true);
        expect(states.has('CRITICAL')).toBe(true);
        expect(states.has('SAFE_LATCHED')).toBe(true);

        const events = new Set(receivedFrames.map(f => f.eventType));
        expect(events.has('GAS_LEAK')).toBe(true);
        expect(events.has('PIPE_RUPTURE')).toBe(true);
        expect(events.has('PRESSURE_ANOMALY')).toBe(true);

        simulator.stop();
    });

    it('should validate all generated frames', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('FULL_DEMO');
        simulator.start();

        vi.advanceTimersByTime(46000);

        receivedFrames.forEach(frame => {
            const validated = validateTelemetryFrame(frame);
            expect(validated).not.toBeNull();
            expect(validated?._validated).toBe(true);
        });

        simulator.stop();
    });

    it('should support time scale changes', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('NORMAL');
        simulator.setTimeScale(2);
        simulator.start();

        vi.advanceTimersByTime(2000);

        const frameCount = receivedFrames.length;

        receivedFrames = [];
        simulator.stop();

        const simulator2 = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });
        simulator2.setScenario('NORMAL');
        simulator2.setTimeScale(1);
        simulator2.start();

        vi.advanceTimersByTime(2000);

        expect(receivedFrames.length).toBeGreaterThan(0);

        simulator2.stop();
    });

    it('should not loop non-loop scenarios', () => {
        const simulator = createMockSimulator((frame) => {
            receivedFrames.push(frame);
        });

        simulator.setScenario('GAS_LEAK_KITCHEN');
        simulator.start();

        vi.advanceTimersByTime(31000);

        expect(simulator.isScenarioRunning()).toBe(false);

        simulator.stop();
    });

    it('should expose scenario metadata', () => {
        const simulator = createMockSimulator((frame) => { receivedFrames.push(frame); });
        
        expect(simulator.getCurrentScenario()).toBe('NORMAL');
        expect(simulator.getAvailableScenarios().length).toBe(10);
        expect(simulator.getScenarioInfo('NORMAL')).toBeDefined();
        expect(simulator.getScenarioInfo('INVALID' as any)).toBeUndefined();
    });
});

describe('Replay Player', () => {
    let receivedFrames: ValidatedTelemetry[] = [];
    let receivedIndices: number[] = [];

    beforeEach(() => {
        receivedFrames = [];
        receivedIndices = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createMockFrames = (count: number): ValidatedTelemetry[] => {
        return Array.from({ length: count }, (_, i) => ({
            schemaVersion: 2,
            source: 'RECORDED_REPLAY' as const,
            sequence: i,
            simTime: i * 0.5,
            timestamp: Date.now() + i * 500,
            systemState: 'NORMAL' as const,
            eventType: 'NONE' as const,
            affectedZoneMask: 0,
            gas: {
                Z1: { adc: 800, level: 'NORMAL', valid: true },
                Z2: { adc: 750, level: 'NORMAL', valid: true },
                Z3: { adc: 700, level: 'NORMAL', valid: true },
            },
            pressure: { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 },
            flow: { main: 5, living: 2 },
            valves: { VM: 'OPEN', VK: 'OPEN', VL: 'OPEN', VT: 'OPEN' },
            buzzer: false,
            greenLed: true,
            redLed: false,
            _validated: true as const,
            _receivedAt: performance.now(),
        }));
    };

    it('should seek to specific position', () => {
        const frames = createMockFrames(10);
        const player = createReplayPlayer(
            (frame, index) => {
                receivedFrames.push(frame);
                receivedIndices.push(index);
            },
            () => {}
        );

        player.loadFrames(frames.map(f => ({ timestamp: 0, simTime: f.simTime, frame: f })));
        player.seek(5);

        expect(receivedIndices[receivedIndices.length - 1]).toBe(5);

        player.stop();
    });

    it('should calculate progress correctly', () => {
        const frames = createMockFrames(10);
        const player = createReplayPlayer(
            (frame) => {
                receivedFrames.push(frame);
            },
            () => {}
        );

        player.loadFrames(frames.map(f => ({ timestamp: 0, simTime: f.simTime, frame: f })));

        expect(player.getProgress()).toBe(0);
        player.seek(4);
        expect(player.getProgress()).toBeCloseTo(4 / 9, 2);
        player.seek(9);
        expect(player.getProgress()).toBe(1);

        player.stop();
    });

    it('should report correct frame counts', () => {
        const frames = createMockFrames(15);
        const player = createReplayPlayer(() => {}, () => {});

        player.loadFrames(frames.map(f => ({ timestamp: 0, simTime: f.simTime, frame: f })));

        expect(player.getTotalFrames()).toBe(15);
        expect(player.getCurrentIndex()).toBe(0);

        player.seek(7);
        expect(player.getCurrentIndex()).toBe(7);
        expect(player.getTotalFrames()).toBe(15);
        expect(player.getTotalDuration()).toBeCloseTo(7.0, 1);

        player.stop();
    });

    it('should handle speed setter bounds', () => {
        const frames = createMockFrames(5);
        const player = createReplayPlayer(() => {}, () => {});

        player.loadFrames(frames.map(f => ({ timestamp: 0, simTime: f.simTime, frame: f })));

        player.setSpeed(0.1); // min
        expect(player.getCurrentIndex()).toBe(0); // still valid

        player.setSpeed(4); // max
        expect(player.getCurrentIndex()).toBe(0);

        player.setSpeed(10); // over max, should clamp
        expect(player.getCurrentIndex()).toBe(0);

        player.stop();
    });
});

describe('ReplayManager', () => {
    it('should record and export frames', async () => {
        const { ReplayManager } = await import('../src/replay/replayManager');
        
        // Test JSON export
        const manager1 = new ReplayManager();
        const mockFrame: ValidatedTelemetry = {
            schemaVersion: 2,
            source: 'MOCK_SIM',
            sequence: 1,
            simTime: 0,
            timestamp: Date.now(),
            systemState: 'NORMAL',
            eventType: 'NONE',
            affectedZoneMask: 0,
            gas: { Z1: { adc: 800, level: 'NORMAL', valid: true }, Z2: { adc: 750, level: 'NORMAL', valid: true }, Z3: { adc: 700, level: 'NORMAL', valid: true } },
            pressure: { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 },
            flow: { main: 5, living: 2 },
            valves: { VM: 'OPEN', VK: 'OPEN', VL: 'OPEN', VT: 'OPEN' },
            buzzer: false,
            greenLed: true,
            redLed: false,
            _validated: true,
            _receivedAt: performance.now(),
        };

        manager1.startRecording();
        manager1.recordFrame(mockFrame);
        manager1.recordFrame({ ...mockFrame, sequence: 2, simTime: 0.5 });

        expect(manager1.isRecordingActive()).toBe(true);
        expect(manager1.getFrameCount()).toBe(2);

        const json = manager1.exportToJson();
        expect(json).toContain('"version":1');

        // Test JSON Lines export (new manager since exportToJson stops recording)
        const manager2 = new ReplayManager();
        manager2.startRecording();
        manager2.recordFrame(mockFrame);
        manager2.recordFrame({ ...mockFrame, sequence: 2, simTime: 0.5 });

        const jsonLines = manager2.exportToJsonLines();
        const lines = jsonLines.trim().split('\n');
        expect(lines.length).toBe(2);
    });

    it('should import from JSON and JSON Lines', async () => {
        const { ReplayManager } = await import('../src/replay/replayManager');
        
        const json = JSON.stringify({
            version: 1,
            source: 'TEST',
            recordedAt: Date.now(),
            duration: 1.0,
            frames: [
                { timestamp: 1000, simTime: 0, frame: { schemaVersion: 2, source: 'MOCK_SIM', sequence: 1, simTime: 0, timestamp: Date.now(), systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: { Z1: { adc: 800, level: 'NORMAL', valid: true }, Z2: { adc: 750, level: 'NORMAL', valid: true }, Z3: { adc: 700, level: 'NORMAL', valid: true } }, pressure: { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 }, flow: { main: 5, living: 2 }, valves: { VM: 'OPEN', VK: 'OPEN', VL: 'OPEN', VT: 'OPEN' }, buzzer: false, greenLed: true, redLed: false, _validated: true, _receivedAt: performance.now() } },
                { timestamp: 1500, simTime: 0.5, frame: { schemaVersion: 2, source: 'MOCK_SIM', sequence: 2, simTime: 0.5, timestamp: Date.now(), systemState: 'NORMAL', eventType: 'NONE', affectedZoneMask: 0, gas: { Z1: { adc: 800, level: 'NORMAL', valid: true }, Z2: { adc: 750, level: 'NORMAL', valid: true }, Z3: { adc: 700, level: 'NORMAL', valid: true } }, pressure: { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 }, flow: { main: 5, living: 2 }, valves: { VM: 'OPEN', VK: 'OPEN', VL: 'OPEN', VT: 'OPEN' }, buzzer: false, greenLed: true, redLed: false, _validated: true, _receivedAt: performance.now() } }
            ]
        });

        const imported = ReplayManager.importFromJson(json);
        expect(imported).not.toBeNull();
        expect(imported!.frames.length).toBe(2);

        const jsonLines = '{"timestamp":1000,"simTime":0,"frame":{"schemaVersion":2}}\n{"timestamp":1500,"simTime":0.5,"frame":{"schemaVersion":2}}';
        const importedLines = ReplayManager.importFromJsonLines(jsonLines);
        expect(importedLines).not.toBeNull();
        expect(importedLines!.frames.length).toBe(2);
    });
});