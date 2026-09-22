import { describe, it, expect } from 'vitest';
import {
    getConnectionStatus,
    getZoneName,
    getValveUpstreamPressure,
    getValveDownstreamPressure,
    getValveDeltaPressure,
    CONNECTION_THRESHOLDS,
    ZONE_MASKS,
} from '../src/telemetry/types';

describe('Telemetry Types - Utility Functions', () => {
    describe('getConnectionStatus', () => {
        it('should return LIVE for recent frames', () => {
            const now = performance.now();
            expect(getConnectionStatus(now - 100, now)).toBe('LIVE');
            expect(getConnectionStatus(now - 1499, now)).toBe('LIVE');
        });

        it('should return STALE for older frames', () => {
            const now = performance.now();
            expect(getConnectionStatus(now - 1500, now)).toBe('STALE');
            expect(getConnectionStatus(now - 2999, now)).toBe('STALE');
        });

        it('should return DISCONNECTED for very old frames', () => {
            const now = performance.now();
            expect(getConnectionStatus(now - 3000, now)).toBe('DISCONNECTED');
            expect(getConnectionStatus(now - 5000, now)).toBe('DISCONNECTED');
        });

        it('should use correct thresholds', () => {
            expect(CONNECTION_THRESHOLDS.LIVE_MAX_MS).toBe(1500);
            expect(CONNECTION_THRESHOLDS.STALE_MAX_MS).toBe(3000);
        });
    });

    describe('getZoneName', () => {
        it('should return correct zone names', () => {
            expect(getZoneName(ZONE_MASKS.ZONE_KITCHEN)).toBe('Kitchen');
            expect(getZoneName(ZONE_MASKS.ZONE_TECHNICAL)).toBe('Technical');
            expect(getZoneName(ZONE_MASKS.ZONE_LIVING)).toBe('Living');
        });

        it('should combine multiple zones', () => {
            expect(getZoneName(ZONE_MASKS.ZONE_KITCHEN | ZONE_MASKS.ZONE_LIVING)).toBe('Kitchen, Living');
            expect(getZoneName(ZONE_MASKS.ZONE_KITCHEN | ZONE_MASKS.ZONE_TECHNICAL | ZONE_MASKS.ZONE_LIVING)).toBe('Kitchen, Technical, Living');
        });

        it('should return None for zero mask', () => {
            expect(getZoneName(0)).toBe('None');
        });
    });

    describe('Valve Pressure Calculations', () => {
        const pressure = { P0: 20, P1: 18, PK: 17, PL: 16, PT: 15 };

        it('should calculate upstream pressure correctly', () => {
            expect(getValveUpstreamPressure('VM', pressure)).toBe(20);
            expect(getValveUpstreamPressure('VK', pressure)).toBe(18);
            expect(getValveUpstreamPressure('VL', pressure)).toBe(18);
            expect(getValveUpstreamPressure('VT', pressure)).toBe(18);
        });

        it('should calculate downstream pressure correctly', () => {
            expect(getValveDownstreamPressure('VM', pressure)).toBe(18);
            expect(getValveDownstreamPressure('VK', pressure)).toBe(17);
            expect(getValveDownstreamPressure('VL', pressure)).toBe(16);
            expect(getValveDownstreamPressure('VT', pressure)).toBe(15);
        });

        it('should calculate delta pressure correctly', () => {
            expect(getValveDeltaPressure('VM', pressure)).toBe(2);
            expect(getValveDeltaPressure('VK', pressure)).toBe(1);
            expect(getValveDeltaPressure('VL', pressure)).toBe(2);
            expect(getValveDeltaPressure('VT', pressure)).toBe(3);
        });

        it('should return 0 for unknown valve', () => {
            expect(getValveUpstreamPressure('VX' as any, pressure)).toBe(0);
            expect(getValveDownstreamPressure('VX' as any, pressure)).toBe(0);
            expect(getValveDeltaPressure('VX' as any, pressure)).toBe(0);
        });
    });

    describe('Zone Masks', () => {
        it('should have correct bit values', () => {
            expect(ZONE_MASKS.ZONE_KITCHEN).toBe(1);
            expect(ZONE_MASKS.ZONE_TECHNICAL).toBe(2);
            expect(ZONE_MASKS.ZONE_LIVING).toBe(4);
        });
    });
});
