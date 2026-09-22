import dgram from 'node:dgram';

import { WebSocket, WebSocketServer } from 'ws';

import { validateTelemetryFrame } from '../telemetry/validator';

const udpPort = Number(process.env.BRIDGE_UDP_PORT ?? 45810);
const wsPort = Number(process.env.BRIDGE_WS_PORT ?? 45811);
const bindHost = process.env.BRIDGE_BIND_HOST ?? '127.0.0.1';
const maxFps = Number(process.env.BRIDGE_MAX_FPS ?? 100);
const minimumFrameIntervalMs = 1000 / maxFps;

if (![udpPort, wsPort, maxFps].every(Number.isFinite) || maxFps <= 0) {
  throw new Error('Invalid bridge port or BRIDGE_MAX_FPS configuration');
}

const clients = new Set<WebSocket>();
const wsServer = new WebSocketServer({ host: bindHost, port: wsPort });
const udpServer = dgram.createSocket('udp4');
let lastAcceptedAt = 0;
let lastSequence = -1;

function send(client: WebSocket, message: unknown) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
}

wsServer.on('connection', client => {
  clients.add(client);
  send(client, { type: 'status', payload: { status: 'connected' }, timestamp: Date.now() });
  client.on('close', () => clients.delete(client));
  client.on('error', error => console.warn('[bridge/ws]', error.message));
  client.on('message', () => {
    send(client, {
      type: 'error',
      payload: { code: 'READ_ONLY', message: 'SIGAS-RT web telemetry is read-only' },
      timestamp: Date.now(),
    });
  });
});

udpServer.on('message', datagram => {
  const now = Date.now();
  if (now - lastAcceptedAt < minimumFrameIntervalMs) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(datagram.toString('utf8'));
  } catch {
    console.warn('[bridge/udp] discarded malformed JSON');
    return;
  }

  const frame = validateTelemetryFrame(parsed);
  if (!frame || frame.source !== 'MATLAB_SIM') {
    console.warn('[bridge/udp] discarded invalid schema-v2 frame');
    return;
  }
  if (frame.sequence <= lastSequence) {
    console.warn(`[bridge/udp] discarded non-monotonic sequence ${frame.sequence}`);
    return;
  }

  lastAcceptedAt = now;
  lastSequence = frame.sequence;
  const message = JSON.stringify({ type: 'telemetry', payload: frame, timestamp: now });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
});

udpServer.on('error', error => console.error('[bridge/udp]', error));
udpServer.bind(udpPort, bindHost, () => {
  console.log(`[bridge] UDP ${bindHost}:${udpPort} -> WS ${bindHost}:${wsPort}`);
  console.log('[bridge] read-only MATLAB_SIM telemetry enabled');
});

function shutdown() {
  clients.forEach(client => client.close());
  wsServer.close();
  udpServer.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
