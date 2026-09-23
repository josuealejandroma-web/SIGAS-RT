import { useEffect, useRef, useState } from 'react';
import * as pc from 'playcanvas';
import { useDigitalTwinStore } from '../state/store';
import type { TelemetryFrameV2 } from '../telemetry';
import { NETWORK, INSTRUMENTS, CAMERA_VIEWS, type Point } from './topology';

export interface Scene3DProps {
  onObjectClick?: (objectName: string, entity?: unknown) => void;
  onSceneReady?: (app: pc.Application) => void;
}
const MODEL_URL = '/models/sigas_house_original.glb';
const V1_GAS = /^SIGAS_(MainPipe|Pipe_|MainValve|AutoValve|MQ2_|GasFlow_|LeakPoint_)/;
const SHELL = /Wall|Roof|Dormer|Facade|Window|Door|Upper_Slab|UpperHall|Bedroom|MasterBed|Balcony|Terrace|Stairs|Upper_Bath/;

export function Scene3D({ onObjectClick }: Scene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const frame = useDigitalTwinStore(s => s.latestFrame);
  const view = useDigitalTwinStore(s => s.activeView);
  const freshness = useDigitalTwinStore(s => s.connectionStatus);
  const callback = useRef(onObjectClick);
  callback.current = onObjectClick;
  useEffect(() => {
    const canvas = canvasRef.current!;
    let disposed = false;
    let house: pc.Entity | undefined;
    let app: pc.Application;
    try {
      app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true, alpha: false } });
    } catch (e) { setError(String(e)); return; }
    // Application defaults to RESOLUTION_FIXED (the canvas starts at 300x150).
    // Resizing its CSS alone stretches that small buffer across the whole panel.
    // AUTO keeps the drawing buffer and camera aspect matched to the visible area.
    const applyResolution = () => {
      const mode = useDigitalTwinStore.getState().performanceMode;
      app.graphicsDevice.maxPixelRatio = mode === 'LOW' ? 1 : mode === 'MEDIUM' ? 1.5 : mode === 'HIGH' ? 3 : 2;
      app.setCanvasResolution(pc.RESOLUTION_AUTO);
    };
    applyResolution();
    app.scene.ambientLight = new pc.Color(0.22, 0.24, 0.28);
    const camera = new pc.Entity('InspectionCamera');
    camera.addComponent('camera', { clearColor: new pc.Color(0.065, 0.09, 0.14), nearClip: 0.05, farClip: 150, fov: 48 });
    app.root.addChild(camera);
    const sun = new pc.Entity('Sun');
    sun.addComponent('light', { type: 'directional', intensity: 0.9, castShadows: true, shadowResolution: 2048, shadowDistance: 40, normalOffsetBias: 0.04 });
    sun.setLocalEulerAngles(45, -35, 0);
    app.root.addChild(sun);
    const fill = new pc.Entity('Fill');
    fill.addComponent('light', { type: 'directional', intensity: 0.3, color: new pc.Color(0.66, 0.8, 1) });
    fill.setLocalEulerAngles(45, 140, 0);
    app.root.addChild(fill);
    const materials: pc.StandardMaterial[] = [];
    const material = (hex: string) => {
      const m = new pc.StandardMaterial();
      m.diffuse.fromString(hex); m.gloss = 0.4; m.update(); materials.push(m); return m;
    };
    const pipes: { material: pc.StandardMaterial; node: keyof TelemetryFrameV2['pressure'] }[] = [];
    const instruments = new Map<string, { material: pc.StandardMaterial; handle?: pc.Entity }>();
    const primitive = (name: string, type: string, position: Point, scale: Point, mat: pc.StandardMaterial) => {
      const e = new pc.Entity(name);
      e.addComponent('render', { type, material: mat, castShadows: true });
      e.setPosition(...position); e.setLocalScale(...scale); app.root.addChild(e); return e;
    };
    for (const branch of NETWORK) {
      const mat = material('#dfad55');
      for (let i = 1; i < branch.points.length; i++) {
        const a = new pc.Vec3(...branch.points[i - 1]), b = new pc.Vec3(...branch.points[i]);
        const center = a.clone().add(b).mulScalar(0.5);
        const e = primitive(branch.id + '_' + i, 'cylinder', [center.x, center.y, center.z], [0.07, a.distance(b), 0.07], mat);
        e.lookAt(b); e.rotateLocal(90, 0, 0);
        pipes.push({ material: mat, node: branch.pressure });
        primitive(branch.id + '_joint_' + i, 'sphere', branch.points[i], [0.08, 0.08, 0.08], mat);
      }
    }
    for (const sensor of INSTRUMENTS) {
      const mat = material('#7f8d9b');
      const valve = sensor.kind === 'valve';
      const e = primitive(sensor.id, valve ? 'cylinder' : 'box', sensor.position, valve ? [0.19, 0.25, 0.19] : [0.16, 0.2, 0.11], mat);
      let handle: pc.Entity | undefined;
      if (valve) {
        handle = new pc.Entity(sensor.id + '_handle');
        handle.addComponent('render', { type: 'box', material: mat });
        e.addChild(handle); handle.setLocalPosition(0, 0.7, 0); handle.setLocalScale(2.4, 0.18, 0.4);
      }
      instruments.set(sensor.id, { material: mat, handle });
    }
    let yaw = 38, pitch = 29, distance = 22, target = new pc.Vec3(0, 2.4, 0);
    const positionCamera = () => {
      const a = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
      camera.setPosition(target.x + distance * Math.cos(p) * Math.sin(a), target.y + distance * Math.sin(p), target.z + distance * Math.cos(p) * Math.cos(a));
      camera.lookAt(target);
    };
    const preset = () => {
      const state = useDigitalTwinStore.getState();
      const name = state.activeCameraPreset ?? (state.activeView === 'CASA' ? 'EXTERIOR' : 'XRAY');
      const v = CAMERA_VIEWS[name] ?? CAMERA_VIEWS.EXTERIOR;
      target = new pc.Vec3(...v.target); yaw = v.yaw; pitch = v.pitch; distance = v.distance; positionCamera();
    };
    let pointer: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!pointer) return;
      yaw -= (e.clientX - pointer.x) * 0.3; pitch = Math.max(8, Math.min(85, pitch + (e.clientY - pointer.y) * 0.3));
      pointer = { x: e.clientX, y: e.clientY }; positionCamera();
    };
    const up = () => { pointer = null; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); distance = Math.max(1.5, Math.min(40, distance * Math.exp(e.deltaY * 0.001))); positionCamera(); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false });
    const resize = new ResizeObserver(() => { const r = canvas.parentElement!.getBoundingClientRect(); app.resizeCanvas(Math.max(1, r.width), Math.max(1, r.height)); });
    resize.observe(canvas.parentElement!);
    const applyTelemetry = () => {
      const state = useDigitalTwinStore.getState(), f = state.latestFrame;
      for (const sensor of INSTRUMENTS) {
        const obj = instruments.get(sensor.id)!;
        let color = '#7f8d9b';
        if (f) {
          if (sensor.kind === 'valve') {
            const opened = f.valves[sensor.key as keyof typeof f.valves] === 'OPEN';
            color = opened ? '#29cf92' : '#fa5252'; obj.handle?.setLocalEulerAngles(0, opened ? 0 : 90, 0);
          } else if (sensor.kind === 'gas') {
            const gas = f.gas[sensor.key as keyof typeof f.gas];
            color = !gas.valid ? '#c990ff' : gas.level === 'CRITICAL' ? '#fa5252' : gas.level === 'WARNING' ? '#ffbd4a' : '#29cf92';
          } else color = '#50bfff';
        }
        obj.material.diffuse.fromString(color); obj.material.update();
      }
      for (const pipe of pipes) {
        if (f && state.activeView === 'PRESION') {
          const p = Math.max(0, Math.min(1, f.pressure[pipe.node] / 30));
          pipe.material.diffuse.set(p, 0.35 + 0.4 * (1 - Math.abs(p - 0.5) * 2), 1 - p);
        } else pipe.material.diffuse.fromString('#dfad55');
        pipe.material.update();
      }
      if (house && f) {
        for (const [name, on] of [['SIGAS_LedGreen', f.greenLed], ['SIGAS_LedRed', f.redLed], ['SIGAS_Buzzer', f.buzzer]] as const) {
          (house.findByName(name) as pc.Entity | null)?.render?.meshInstances.forEach(mi => { const m = mi.material as pc.StandardMaterial; m.emissive.copy(m.diffuse).mulScalar(on ? 1 : 0); m.update(); });
        }
      }
    };
    const applyView = () => {
      const state = useDigitalTwinStore.getState();
      if (house) for (const render of house.findComponents('render') as pc.RenderComponent[]) {
        const name = render.entity.name, hidden = /Helper/.test(name) || V1_GAS.test(name);
        render.enabled = !hidden && (state.activeView === 'CASA' || !SHELL.test(name));
        for (const mesh of render.meshInstances) {
          const m = mesh.material as pc.StandardMaterial;
          m.opacity = state.activeView === 'TUBERIAS' ? 0.15 : state.activeView === 'XRAY' ? 0.3 : 1;
          m.blendType = m.opacity < 1 ? pc.BLEND_NORMAL : pc.BLEND_NONE;
          m.depthWrite = m.opacity === 1; m.update();
        }
      }
      sun.light!.castShadows = state.performanceMode !== 'LOW'; preset(); applyTelemetry();
    };
    app.assets.loadFromUrl(MODEL_URL, 'container', (err, asset) => {
      if (disposed) return;
      if (err || !asset) { setError('No se pudo cargar la casa original: ' + String(err)); return; }
      house = (asset.resource as pc.ContainerResource).instantiateRenderEntity();
      app.root.addChild(house!);
      for (const render of house!.findComponents('render') as pc.RenderComponent[]) {
        render.meshInstances.forEach(mi => { const m = (mi.material as pc.StandardMaterial).clone(); materials.push(m); mi.material = m; });
      }
      applyView(); setLoaded(true);
    });
    const unsubView = useDigitalTwinStore.subscribe(s => s.activeView + ':' + s.activeCameraPreset, applyView);
    const unsubQuality = useDigitalTwinStore.subscribe(s => s.performanceMode, () => {
      applyResolution();
      sun.light!.castShadows = useDigitalTwinStore.getState().performanceMode !== 'LOW';
    });
    const unsubFrame = useDigitalTwinStore.subscribe(s => s.latestFrame, applyTelemetry);
    const screen = new pc.Vec3();
    let elapsed = 0, frames = 0;
    app.on('update', (dt: number) => {
      elapsed += dt; frames++;
      if (elapsed > 1) { useDigitalTwinStore.getState().updatePerformanceMetrics(Math.round(frames / elapsed), elapsed * 1000 / frames); elapsed = 0; frames = 0; }
      const boxes: {x:number;y:number;w:number;h:number}[] = [];
      for (const instrument of INSTRUMENTS) {
        const el = labelRef.current?.querySelector<HTMLElement>('[data-instrument="' + instrument.id + '"]');
        if (!el) continue;
        camera.camera!.worldToScreen(new pc.Vec3(...instrument.position), screen);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        el.style.display = screen.z > 0 && screen.x >= 0 && screen.x < w && screen.y > 0 && screen.y < h ? '' : 'none';
        const width = el.offsetWidth, height = el.offsetHeight;
        const x = Math.max(width / 2 + 3, Math.min(w - width / 2 - 3, screen.x));
        let y = Math.max(88, Math.min(h - 78, screen.y));
        for (let attempt = 0; attempt < 12; attempt++) {
          const collision = boxes.some(b => Math.abs(x - b.x) < (width + b.w) / 2 + 3 && Math.abs(y - b.y) < (height + b.h) / 2 + 3);
          if (!collision) break;
          y -= height + 4;
          if (y < 88) y = Math.min(h - 78, screen.y + (attempt + 1) * (height + 4));
        }
        y = Math.max(88, Math.min(h - 78, y));
        boxes.push({x,y,w:width,h:height});
        el.style.left = x + 'px'; el.style.top = y + 'px';
      }
    });
    preset(); app.start();
    return () => {
      disposed = true; resize.disconnect(); unsubView(); unsubQuality(); unsubFrame();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('wheel', wheel);
      app.destroy(); materials.forEach(m => m.destroy());
    };
  }, []);
  return <>
    <canvas ref={canvasRef} className="pc-app" aria-label="Casa original y red de gas V2, escena 3D" />
    <div className="scene-caption">{error || (!loaded ? 'Cargando casa original…' : view + ' · Casa original / instrumentación V2')}<small>Arrastrar: girar · Rueda: acercar · Etiquetas: inspeccionar</small></div>
    <div ref={labelRef} className="scene-labels">
      {view !== 'CASA' && INSTRUMENTS.filter(s => view === 'PRESION' ? s.kind === 'pressure' : view === 'SEGURIDAD' ? s.kind === 'gas' : view === 'TUBERIAS' ? s.kind === 'valve' : s.kind !== 'pressure').map(s => <button key={s.id} data-instrument={s.id} onClick={() => callback.current?.(s.id)}>
        {s.label}{frame && s.kind === 'pressure' ? ' ' + frame.pressure[s.key as keyof typeof frame.pressure].toFixed(2) + ' mbar' : ''}
        {frame && s.kind === 'valve' ? ' ' + (frame.valves[s.key as keyof typeof frame.valves] === 'OPEN' ? 'ABIERTA' : 'CERRADA') : ''}
      </button>)}
    </div>
    {view !== 'CASA' && <div className="scene-legend">{view === 'PRESION' ? 'Presión nodal · 0 mbar azul → 30 mbar rojo · ΔP incluye tubería' : 'Verde: normal/abierta · Rojo: alarma/cerrada · Violeta: sensor inválido'}<br />{!frame ? 'Esperando resultados · ' : freshness !== 'LIVE' ? 'Último resultado conservado · ' : ''}Diámetros ampliados para inspección. Sin difusión CFD.</div>}
  </>;
}
