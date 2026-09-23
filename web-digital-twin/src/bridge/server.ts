import dgram from 'node:dgram';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { validateTelemetryFrame } from '../telemetry/validator';
import { OFFLINE_STATUS, validScenario, type MatlabStatus } from './protocol';
import { belongsToRun } from './framePolicy';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const runtime = resolve(root, 'tools', 'web-matlab-' + process.pid);
mkdirSync(runtime, { recursive: true });
const udpPort = Number(process.env.BRIDGE_UDP_PORT ?? 45810);
const wsPort = Number(process.env.BRIDGE_WS_PORT ?? 45811);
const wsServer = new WebSocketServer({ host: '127.0.0.1', port: wsPort, maxPayload: 4096,
  verifyClient: ({ origin }: { origin: string }) => !origin || /^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(origin),
});
const udpServer = dgram.createSocket('udp4');
const clients = new Set<WebSocket>();
let worker: ChildProcess | null = null;
let status: MatlabStatus = { ...OFFLINE_STATUS };
let lastFrame: ReturnType<typeof validateTelemetryFrame> = null;
let lastSequence = -1;
let pending = false;
const logPath = resolve(runtime, 'matlab.log');
function send(client: WebSocket, type: string, payload: unknown) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
}
function broadcast(type: string, payload: unknown) { clients.forEach(c => send(c, type, payload)); }
function command(value: object) {
  const path = resolve(runtime, 'command.json');
  writeFileSync(path + '.tmp', JSON.stringify(value));
  renameSync(path + '.tmp', path);
}
function runScenario(scenario: string) {
  if (!validScenario(scenario)) throw new Error('Escenario MATLAB desconocido.');
  if (!worker || !status.connected) throw new Error('MATLAB todavía no está listo.');
  if (pending || ['computing', 'playing'].includes(status.phase)) throw new Error('Espera a que termine el escenario actual.');
  const runId = randomUUID();
  const stopTime = scenario === 'FULL_DEMO' ? 40 : Number(process.env.MATLAB_STOP_TIME ?? 8);
  const playbackRate = Number(process.env.MATLAB_PLAYBACK_RATE ?? 1);
  if (!Number.isFinite(stopTime) || stopTime <= 0 || stopTime > 60 || !Number.isFinite(playbackRate) || playbackRate < 0.1 || playbackRate > 4) throw new Error('Duración o velocidad inválida.');
  pending = true; lastSequence = -1; lastFrame = null;
  status = { ...status, phase: 'computing', scenario, runId, message: '' };
  command({ action: 'run', scenario: 'V2_' + scenario, runId, stopTime, playbackRate, udpPort });
  broadcast('status', status);
}
function startWorker() {
  if (worker) return;
  const exe = process.env.MATLAB_EXE ?? 'C:/Program Files/MATLAB/R2026a/bin/win64/MATLAB.exe';
  if (!existsSync(exe)) throw new Error('No se encontró MATLAB. Configura MATLAB_EXE.');
  command({ action: 'idle' });
  status = { ...OFFLINE_STATUS, phase: 'starting' };
  writeFileSync(resolve(runtime, 'status.json'), JSON.stringify(status));
  const quote = (s: string) => s.replaceAll("'", "''").replaceAll('\\', '/');
  const batch = "cd('" + quote(root) + "'); addpath('" + quote(resolve(root, 'matlab/scripts')) + "'); web_simulation_worker('" + quote(runtime) + "');";
  worker = spawn(exe, ['-batch', batch], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  worker.stdout?.on('data', data => appendFileSync(logPath, data));
  worker.stderr?.on('data', data => appendFileSync(logPath, data));
  worker.on('error', error => { status = { ...status, connected: false, phase: 'error', message: error.message }; broadcast('status', status); });
  worker.on('exit', code => {
    worker = null; pending = false;
    status = { ...status, connected: false, phase: code ? 'error' : 'offline', message: code ? 'MATLAB terminó con código ' + code + '. Revisa tools/web-matlab-' + process.pid + '/matlab.log' : '' };
    broadcast('status', status);
  });
  broadcast('status', status);
}
wsServer.on('connection', client => {
  clients.add(client); send(client, 'status', status);
  if (lastFrame) send(client, 'snapshot', lastFrame); // snapshot never refreshes sample age
  client.on('close', () => clients.delete(client));
  client.on('error', e => console.warn(e.message));
  client.on('message', bytes => {
    try {
      const msg = JSON.parse(bytes.toString());
      if (msg.type !== 'command') throw new Error('Comando inválido.');
      if (msg.action === 'start') startWorker();
      else if (msg.action === 'stop') {
        if (worker && !['idle', 'completed', 'error'].includes(status.phase)) throw new Error('La simulación está ocupada; espera a que termine.');
        command({ action: 'stop' });
      } else if (msg.action === 'run') runScenario(msg.scenario);
      else throw new Error('Solo se permite iniciar/cerrar MATLAB y ejecutar escenarios predefinidos.');
    } catch (e) { send(client, 'error', { message: String(e) }); }
  });
});
udpServer.on('message', bytes => {
  try {
    const f = validateTelemetryFrame(JSON.parse(bytes.toString()));
    // Ownership by run prevents stale/foreign sessions and sequence-reset lockout.
    if (!belongsToRun(f, status.runId, lastSequence)) return;
    lastSequence = f.sequence; lastFrame = f;
    broadcast('telemetry', f);
  } catch { /* Invalid datagrams cannot become telemetry. */ }
});
udpServer.on('error', e => console.error(e));
udpServer.bind(udpPort, '127.0.0.1');
let initialRun = process.env.MATLAB_AUTO_RUN !== '0';
const timer = setInterval(() => {
  if (worker) {
    try {
      const report = JSON.parse(readFileSync(resolve(runtime, 'status.json'), 'utf8')) as MatlabStatus;
      if (report.phase !== 'starting' && (!pending || report.runId === status.runId)) {
        status = { ...report, connected: true };
        if (['completed', 'error'].includes(status.phase)) pending = false;
      }
      if (status.phase === 'idle' && initialRun) { initialRun = false; runScenario(process.env.MATLAB_INITIAL_SCENARIO ?? 'NORMAL'); }
    } catch { /* atomic status replacement may briefly race the read */ }
  }
  broadcast('status', status); // Transport/session heartbeat, never fabricated measurements.
}, 1000);
function shutdown() {
  clearInterval(timer); command({ action: 'stop' }); worker?.kill();
  clients.forEach(c => c.close()); wsServer.close(); udpServer.close();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
console.log('[bridge] local ports UDP ' + udpPort + ', WS ' + wsPort + '; log ' + logPath);
if (process.env.MATLAB_AUTOSTART !== '0') {
  try { startWorker(); } catch (e) { status = { ...status, phase: 'error', message: String(e) }; }
}
