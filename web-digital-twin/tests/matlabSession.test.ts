import { beforeEach, describe, expect, it } from 'vitest';
import { belongsToRun, receivedAt } from '../src/bridge/framePolicy';
import { MATLAB_SCENARIOS, OFFLINE_STATUS, validScenario } from '../src/bridge/protocol';
import { useDigitalTwinStore } from '../src/state/store';
import { validateTelemetryFrame } from '../src/telemetry/validator';
import { INSTRUMENTS, NETWORK } from '../src/scene/topology';
const frame = (runId = 'a', sequence = 1) => validateTelemetryFrame({
  schemaVersion:2,source:'MATLAB_SIM',runId,sequence,flowUnit:'kg/s',simTime:1,timestamp:1000,
  systemState:'NORMAL',eventType:'NONE',affectedZoneMask:0,
  gas:Object.fromEntries(['Z1','Z2','Z3'].map(z=>[z,{adc:0,level:'NORMAL',valid:true}])),
  pressure:{P0:20,P1:19,PK:18,PT:18,PL:18},flow:{main:0.001,living:0.0001},
  valves:{VM:'OPEN',VK:'OPEN',VT:'OPEN',VL:'OPEN'},buzzer:false,greenLed:true,redLed:false,
})!;
describe('Persistent MATLAB sessions', () => {
  beforeEach(() => useDigitalTwinStore.getState().reset());
  it('accepts only allowlisted scenario stimuli, never actuator commands', () => {
    expect(MATLAB_SCENARIOS.length).toBe(11);
    for (const s of MATLAB_SCENARIOS) expect(validScenario(s)).toBe(true);
    expect(validScenario('OPEN_VM')).toBe(false);
    expect(validScenario("NORMAL'); system('bad')")).toBe(false);
  });
  it('rejects duplicates and old runs while permitting reset sequences on a new run', () => {
    expect(belongsToRun(frame('a',2),'a',1)).toBe(true);
    expect(belongsToRun(frame('a',1),'a',1)).toBe(false);
    expect(belongsToRun(frame('a',99),'b',-1)).toBe(false);
    expect(belongsToRun(frame('b',1),'b',-1)).toBe(true);
  });
  it('does not reinterpret volumetric or missing units as mass flow', () => {
    expect(belongsToRun({...frame(),flowUnit:'L/min'},'a',0)).toBe(false);
    expect(belongsToRun({...frame(),flowUnit:undefined},'a',0)).toBe(false);
  });
  it('preserves snapshot age and reports stale data separately from session health', () => {
    const f = frame(); f._receivedAt = receivedAt(1000,100,11000);
    const store = useDigitalTwinStore.getState();
    store.setMatlabStatus({...OFFLINE_STATUS,connected:true,phase:'completed',runId:'a'});
    store.setTelemetryFrame(f); store.updateConnectionStatus(100);
    expect(useDigitalTwinStore.getState().connectionStatus).toBe('DISCONNECTED');
    expect(useDigitalTwinStore.getState().matlab.connected).toBe(true);
  });
  it('clears previous scenario measurements while computing the next run', () => {
    const store = useDigitalTwinStore.getState();
    store.setMatlabStatus({...OFFLINE_STATUS,connected:true,phase:'playing',runId:'a'});
    store.setTelemetryFrame(frame()); store.setTelemetryFrame(frame('a',2));
    store.setMatlabStatus({...OFFLINE_STATUS,connected:true,phase:'computing',runId:'b'});
    expect(useDigitalTwinStore.getState().latestFrame).toBeNull();
    expect(useDigitalTwinStore.getState().frameHistory).toHaveLength(0);
  });
  it('maps all V2 instruments without duplicates and puts the master upstream of branches', () => {
    expect(new Set(INSTRUMENTS.map(i=>i.id)).size).toBe(12);
    expect(INSTRUMENTS.filter(i=>i.kind==='valve')).toHaveLength(4);
    expect(INSTRUMENTS.filter(i=>i.kind==='pressure')).toHaveLength(5);
    const vm = INSTRUMENTS.find(i=>i.key==='VM')!;
    expect(NETWORK[0].points.at(-1)).toEqual(vm.position);
    expect(NETWORK.find(b=>b.id==='manifold')!.points[0]).toEqual(vm.position);
    for (const id of ['kitchen','technical','living']) {
      expect(NETWORK.find(b=>b.id===id)!.points[0][0]).toBeGreaterThan(vm.position[0]);
    }
  });
});
