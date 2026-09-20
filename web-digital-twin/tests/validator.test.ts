import { describe, it, expect } from 'vitest';
import { validateTelemetryFrame, parseTelemetryJson } from '../src/telemetry/validator';
import type { TelemetryFrameV2 } from '../src/telemetry/types';

const createValidFrame = (overrides: Partial<TelemetryFrameV2> = {}): TelemetryFrameV2 => ({
    schemaVersion: 2,
    source: 'MOCK_SIM',
    sequence: 1,
    simTime: 0,
    timestamp: Date.now(),
    systemState: 'NORMAL',
    eventType: 'NONE',
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
    ...overrides,
});

describe('Telemetry Validator', () => {
    describe('validateTelemetryFrame', () => {
        it('should validate a correct frame', () => {
            const frame = createValidFrame();
            const result = validateTelemetryFrame(frame);
            expect(result).not.toBeNull();
            expect(result?._validated).toBe(true);
            expect(result?.schemaVersion).toBe(2);
        });

        it('should reject frame with wrong schema version', () => {
            const frame = createValidFrame({ schemaVersion: 1 });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid source', () => {
            const frame = createValidFrame({ source: 'INVALID_SOURCE' as any });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with non-finite sequence', () => {
            const frame = createValidFrame({ sequence: NaN });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid system state', () => {
            const frame = createValidFrame({ systemState: 'INVALID' as any });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid event type', () => {
            const frame = createValidFrame({ eventType: 'INVALID' as any });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid gas zone data', () => {
            const frame = createValidFrame({
                gas: {
                    Z1: { adc: 800, level: 'NORMAL', valid: true },
                    Z2: { adc: 'invalid' as any, level: 'NORMAL', valid: true },
                    Z3: { adc: 700, level: 'NORMAL', valid: true },
                },
            });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid gas level', () => {
            const frame = createValidFrame({
                gas: {
                    Z1: { adc: 800, level: 'INVALID_LEVEL', valid: true },
                    Z2: { adc: 750, level: 'NORMAL', valid: true },
                    Z3: { adc: 700, level: 'NORMAL', valid: true },
                },
            });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid pressure data', () => {
            const frame = createValidFrame({
                pressure: { P0: 20, P1: 18, PK: 17, PL: 'invalid' as any, PT: 15 },
            });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid flow data', () => {
            const frame = createValidFrame({
                flow: { main: 5, living: 'invalid' as any },
            });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with invalid valve state', () => {
            const frame = createValidFrame({
                valves: { VM: 'OPEN', VK: 'OPEN', VL: 'INVALID' as any, VT: 'OPEN' },
            });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject frame with non-boolean buzzer', () => {
            const frame = createValidFrame({ buzzer: 'true' as any });
            const result = validateTelemetryFrame(frame);
            expect(result).toBeNull();
        });

        it('should reject null or undefined', () => {
            expect(validateTelemetryFrame(null)).toBeNull();
            expect(validateTelemetryFrame(undefined)).toBeNull();
            expect(validateTelemetryFrame('string')).toBeNull();
            expect(validateTelemetryFrame(123)).toBeNull();
        });

        it('should accept all valid sources', () => {
            const sources = ['MOCK_SIM', 'MATLAB_SIM', 'RECORDED_REPLAY'] as const;
            sources.forEach(source => {
                const frame = createValidFrame({ source });
                const result = validateTelemetryFrame(frame);
                expect(result).not.toBeNull();
                expect(result?.source).toBe(source);
            });
        });

        it('should accept all valid system states', () => {
            const states = ['STARTUP', 'NORMAL', 'WARNING', 'CRITICAL', 'SAFE_LATCHED', 'FAULT'] as const;
            states.forEach(systemState => {
                const frame = createValidFrame({ systemState });
                const result = validateTelemetryFrame(frame);
                expect(result).not.toBeNull();
                expect(result?.systemState).toBe(systemState);
            });
        });

        it('should accept all valid event types', () => {
            const events = ['NONE', 'GAS_LEAK', 'PRESSURE_ANOMALY', 'PIPE_RUPTURE', 'SUPPLY_PRESSURE_LOSS', 'SENSOR_FAULT', 'MULTI_ZONE'] as const;
            events.forEach(eventType => {
                const frame = createValidFrame({ eventType });
                const result = validateTelemetryFrame(frame);
                expect(result).not.toBeNull();
                expect(result?.eventType).toBe(eventType);
            });
        });

        it('should accept all valid valve states', () => {
            const valves = ['OPEN', 'CLOSED'] as const;
            valves.forEach(state => {
                const frame = createValidFrame({ valves: { VM: state, VK: state, VL: state, VT: state } });
                const result = validateTelemetryFrame(frame);
                expect(result).not.toBeNull();
                expect(result?.valves.VM).toBe(state);
            });
        });

        it('should accept all valid gas levels', () => {
            const levels = ['NORMAL', 'WARNING', 'CRITICAL', 'FAULT'] as const;
            levels.forEach(level => {
                const frame = createValidFrame({
                    gas: {
                        Z1: { adc: 800, level, valid: true },
                        Z2: { adc: 750, level: 'NORMAL', valid: true },
                        Z3: { adc: 700, level: 'NORMAL', valid: true },
                    },
                });
                const result = validateTelemetryFrame(frame);
                expect(result).not.toBeNull();
                expect(result?.gas.Z1.level).toBe(level);
            });
        });
    });

    describe('parseTelemetryJson', () => {
        it('should parse valid JSON string', () => {
            const frame = createValidFrame();
            const json = JSON.stringify(frame);
            const result = parseTelemetryJson(json);
            expect(result).not.toBeNull();
            expect(result?._validated).toBe(true);
        });

        it('should return null for invalid JSON', () => {
            const result = parseTelemetryJson('invalid json');
            expect(result).toBeNull();
        });

        it('should return null for valid JSON but invalid frame', () => {
            const json = JSON.stringify({ schemaVersion: 1 });
            const result = parseTelemetryJson(json);
            expect(result).toBeNull();
        });
    });
});