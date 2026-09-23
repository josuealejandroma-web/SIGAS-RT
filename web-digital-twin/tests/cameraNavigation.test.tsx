import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CameraPresetSelector, ViewSelector } from '../src/ui/Panels';
import { useDigitalTwinStore } from '../src/state/store';

describe('Camera and inspection view navigation', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    useDigitalTwinStore.getState().reset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<><ViewSelector /><CameraPresetSelector /></>));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  const choose = (value: string) => act(() => {
    const select = container.querySelector('select')!;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const view = (name: string) => act(() => {
    container.querySelector<HTMLButtonElement>(`button[title="${name}"]`)!.click();
  });

  it.each(['VISTA_SUPERIOR', 'XRAY', 'COCINA', 'LIVING', 'AREA_TECNICA', 'MANIFOLD_MEDIDOR'])(
    'opens the interior when selecting %s directly from CASA', preset => {
      choose(preset);
      expect(useDigitalTwinStore.getState().activeView).toBe('XRAY');
      expect(container.querySelector('button[title="XRAY"]')!.getAttribute('aria-selected')).toBe('true');
      expect(useDigitalTwinStore.getState().activeCameraPreset).toBe(preset);
    },
  );
  it.each(['COCINA', 'LIVING', 'AREA_TECNICA'])('returns safely to CASA from %s', preset => {
    choose(preset); view('CASA');
    expect(useDigitalTwinStore.getState().activeCameraPreset).toBe('EXTERIOR');
    expect(useDigitalTwinStore.getState().activeView).toBe('CASA');
  });
  it('restores the closed house and exterior camera using EXTERIOR', () => {
    choose('VISTA_SUPERIOR'); choose('EXTERIOR');
    expect(useDigitalTwinStore.getState().activeView).toBe('CASA');
    expect(useDigitalTwinStore.getState().activeCameraPreset).toBe('EXTERIOR');
  });
  it('keeps the pressure inspection view when selecting a room', () => {
    view('PRESIÓN'); choose('COCINA');
    expect(useDigitalTwinStore.getState().activeView).toBe('PRESION');
    expect(useDigitalTwinStore.getState().activeCameraPreset).toBe('COCINA');
  });
  it('opens XRAY from another inspection view when explicitly selected', () => {
    view('SEGURIDAD'); choose('VISTA_SUPERIOR');
    expect(useDigitalTwinStore.getState().activeView).toBe('XRAY');
  });
  it('moves off the exterior camera when switching to an inspection tab', () => {
    choose('EXTERIOR'); view('TUBERÍAS');
    expect(useDigitalTwinStore.getState().activeCameraPreset).toBe('XRAY');
    expect(useDigitalTwinStore.getState().activeView).toBe('TUBERIAS');
  });
});
