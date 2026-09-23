import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenarioPanel } from '../src/ui/Panels';
import { useDigitalTwinStore } from '../src/state/store';
import { OFFLINE_STATUS } from '../src/bridge/protocol';

describe('Scenario controls', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onCommand = vi.fn();
  beforeEach(() => {
    useDigitalTwinStore.getState().reset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    onCommand.mockClear();
    window.addEventListener('matlab-command', onCommand);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.removeEventListener('matlab-command', onCommand);
  });
  const render = () => act(() => root.render(<ScenarioPanel />));
  const clickKitchen = () => act(() => container.querySelector<HTMLButtonElement>('button[title="FUGA COCINA"]')!.click());

  it('runs the selected MATLAB scenario and selects its inspection camera', () => {
    const store = useDigitalTwinStore.getState();
    store.setSource('MATLAB_SIM');
    store.setMatlabStatus({ ...OFFLINE_STATUS, connected: true, phase: 'completed' });
    render(); clickKitchen();
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect((onCommand.mock.calls[0][0] as CustomEvent).detail).toEqual({ type: 'command', action: 'run', scenario: 'GAS_LEAK_KITCHEN' });
    expect(useDigitalTwinStore.getState().activeCameraPreset).toBe('COCINA');
  });

  it.each(['offline', 'computing', 'playing'] as const)('blocks new runs while %s', phase => {
    const store = useDigitalTwinStore.getState();
    store.setSource('MATLAB_SIM');
    store.setMatlabStatus({ ...OFFLINE_STATUS, connected: phase !== 'offline', phase });
    render(); clickKitchen();
    expect(onCommand).not.toHaveBeenCalled();
  });

  it('keeps synthetic scenarios local to the mock simulator', () => {
    const onMock = vi.fn();
    window.addEventListener('mock-scenario-change', onMock);
    try {
      render(); clickKitchen();
      expect(onMock).toHaveBeenCalledTimes(1);
      expect(onCommand).not.toHaveBeenCalled();
    } finally { window.removeEventListener('mock-scenario-change', onMock); }
  });
});
