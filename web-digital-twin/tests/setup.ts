import { vi } from 'vitest';

// Mock performance.now for consistent timing in tests
let mockTime = 0;
vi.stubGlobal('performance', {
    now: () => mockTime,
});

export function setMockTime(time: number) {
    mockTime = time;
}

export function advanceMockTime(delta: number) {
    mockTime += delta;
}

// Mock requestAnimationFrame for tests
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0);
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    clearTimeout(id);
});

// Mock WebSocket for bridge tests
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    url: string;

    constructor(url: string) {
        this.url = url;
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.(new Event('open'));
        }, 0);
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        // Mock send
    }

    close() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close'));
    }
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock console to reduce noise
const originalError = console.error;
console.error = (...args: unknown[]) => {
    if (args[0]?.toString().includes('act(...)')) return;
    originalError.apply(console, args);
};