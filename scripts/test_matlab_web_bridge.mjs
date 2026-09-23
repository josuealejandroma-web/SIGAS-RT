// Integration test against the existing LOCAL simulator, not hardware.
import WebSocket from '../web-digital-twin/node_modules/ws/wrapper.mjs';
import assert from 'node:assert/strict';
const scenarios = process.argv.slice(2);
if (!scenarios.length) scenarios.push('GAS_LEAK_KITCHEN','GAS_LEAK_TECHNICAL','GAS_LEAK_LIVING','PIPE_RUPTURE_LIVING','PRESSURE_DROP_NO_GAS','FALSE_PRESSURE_SPIKE','PRESSURE_SENSOR_FAILURE','GAS_SENSOR_FAILURE_Z3','MULTI_ZONE_LEAK','FULL_DEMO','NORMAL');
const socket = new WebSocket('ws://127.0.0.1:45811');
let current = null, runId = '', frames = [], sent = false;
const timeout = setTimeout(() => { console.error('TIMEOUT'); socket.close(); process.exitCode = 1; }, 30 * 60 * 1000);
socket.on('error', error => { console.error(error); process.exitCode = 1; clearTimeout(timeout); });
socket.on('message', bytes => {
  const msg = JSON.parse(bytes.toString());
  if (msg.type === 'error') { console.error(msg); socket.close(); clearTimeout(timeout); process.exitCode = 1; return; }
  if (msg.type === 'telemetry' && msg.payload.runId === runId) {
    const f = msg.payload;
    assert.equal(f.flowUnit,'kg/s');
    if (frames.length) { assert(f.sequence > frames.at(-1).sequence); assert(f.simTime >= frames.at(-1).simTime); }
    frames.push(f);
  }
  if (msg.type !== 'status') return;
  const s = msg.payload;
  if (s.phase === 'error') { console.error(s); socket.close(); clearTimeout(timeout); process.exitCode = 1; return; }
  if (sent && s.scenario.replace('V2_','') === current && s.phase === 'computing') runId = s.runId;
  if (sent && s.runId === runId && s.phase === 'completed') {
    assert(frames.length > 2, 'Expected real advancing telemetry');
    const last = frames.at(-1);
    console.log(JSON.stringify({scenario:current,frames:frames.length,events:[...new Set(frames.map(f=>f.eventType))],states:[...new Set(frames.map(f=>f.systemState))],finalValves:last.valves,finalPressure:last.pressure,simTime:last.simTime}));
    sent = false;
  }
  if (!sent && s.connected && ['idle','completed'].includes(s.phase)) {
    current = scenarios.shift();
    if (!current) { socket.close(); clearTimeout(timeout); console.log('INTEGRATION_COMPLETE'); return; }
    frames = []; runId = ''; sent = true;
    console.log('RUN ' + current);
    socket.send(JSON.stringify({type:'command',action:'run',scenario:current}));
  }
});
