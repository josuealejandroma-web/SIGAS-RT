import { Application, Container, Entity } from '@playcanvas/react';
import { Camera, Script, Light } from '@playcanvas/react/components';
import { useApp, useModel } from '@playcanvas/react/hooks';
import { TONEMAP_ACES2 } from 'playcanvas';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { ProceduralSky } from 'playcanvas/scripts/esm/sky/procedural-sky.mjs';
import { useEffect, useRef, useMemo } from 'react';
import type { CameraPreset, SceneObjectRefs, PerformanceMode } from './types';
import { CAMERA_PRESETS } from './types';
import { useDigitalTwinStore, selectActiveView, selectActiveCameraPreset, selectPerformanceMode } from '../state/store';

const MODEL_URL = '/models/sigas_house_web.glb';

export interface Scene3DProps {
  onObjectClick?: (objectName: string, entity: any) => void;
  onSceneReady?: (app: any) => void;
}

// Wrapper for Light with color prop support
const LightWithColor = Light as any;

export function Scene3D({ onObjectClick, onSceneReady }: Scene3DProps) {
  const performanceMode = useDigitalTwinStore(selectPerformanceMode);

  return (
    <Application
      canvasId="sigas-canvas"
      autoRender={true}
      graphicsDeviceOptions={{
        powerPreference: 'high-performance',
        antialias: performanceMode !== 'LOW',
        alpha: false,
        preserveDrawingBuffer: false,
      }}
    >
      <SceneContent
        onObjectClick={onObjectClick}
        onSceneReady={onSceneReady}
        performanceMode={performanceMode}
      />
    </Application>
  );
}

type SceneContentProps = Scene3DProps & {
  performanceMode: PerformanceMode;
};

function SceneContent({ onObjectClick, onSceneReady, performanceMode }: SceneContentProps) {
  const app = useApp();
  const { asset, loading, error } = useModel(MODEL_URL);
  const activeView = useDigitalTwinStore(selectActiveView);
  const activeCameraPreset = useDigitalTwinStore(selectActiveCameraPreset);
  const containerRef = useRef<any>(null);
  const cameraEntityRef = useRef<any>(null);
  const presetTransitionRef = useRef<{ from: CameraPreset; to: CameraPreset; startTime: number; duration: number } | null>(null);

  const cameraPreset = useMemo(() => {
    if (activeCameraPreset) {
      return CAMERA_PRESETS.find(p => p.name === activeCameraPreset);
    }
    return CAMERA_PRESETS.find(p => p.name === 'EXTERIOR');
  }, [activeCameraPreset]);

  useEffect(() => {
    if (onSceneReady) {
      onSceneReady(app);
    }
  }, [app, onSceneReady]);

  const handleEntityClick = (entity: any, event: Event) => {
    if (onObjectClick) {
      onObjectClick(entity.name, entity);
    }
  };

  const applyViewSettings = (container: any) => {
    if (!container) return;

    container.traverse((entity: any) => {
      const name = entity.name;

      if (activeView === 'XRAY') {
        if (isWallOrRoof(name)) {
          setEntityOpacity(entity, 0.15);
          entity.render?.meshInstances?.forEach((mi: any) => {
            if (mi.material) {
              mi.material.depthTest = false;
              mi.material.blendType = 1;
            }
          });
        }
      } else if (activeView === 'TUBERIAS') {
        if (isPipe(name)) {
          setEntityOpacity(entity, 1);
          setEntityEmissive(entity, 0.3);
        } else if (isWallOrRoof(name)) {
          setEntityOpacity(entity, 0.3);
        } else {
          setEntityOpacity(entity, 0.5);
        }
      } else if (activeView === 'PRESION') {
        if (isPipe(name)) {
          setEntityOpacity(entity, 1);
        } else if (isWallOrRoof(name)) {
          setEntityOpacity(entity, 0.4);
        } else {
          setEntityOpacity(entity, 0.6);
        }
      } else if (activeView === 'SEGURIDAD') {
        if (isSensorOrValve(name)) {
          setEntityOpacity(entity, 1);
          setEntityEmissive(entity, 0.2);
        } else if (isWallOrRoof(name)) {
          setEntityOpacity(entity, 0.4);
        } else {
          setEntityOpacity(entity, 0.5);
        }
      } else {
        setEntityOpacity(entity, 1);
        setEntityEmissive(entity, 0);
        entity.render?.meshInstances?.forEach((mi: any) => {
          if (mi.material) {
            mi.material.depthTest = true;
          }
        });
      }
    });
  };

  useEffect(() => {
    if (containerRef.current) {
      applyViewSettings(containerRef.current);
    }
  }, [activeView]);

  useEffect(() => {
    if (!asset || !cameraEntityRef.current || !cameraPreset) return;

    const camera = cameraEntityRef.current;
    camera.setPosition(...cameraPreset.position);
    camera.lookAt(0, 2.5, 0);
  }, [asset, cameraPreset]);

  const animateCameraToPreset = (preset: CameraPreset) => {
    if (!cameraEntityRef.current) return;
    const currentPreset = cameraPreset;
    if (!currentPreset) return;

    presetTransitionRef.current = {
      from: currentPreset,
      to: preset,
      startTime: performance.now(),
      duration: 800,
    };
  };

  useEffect(() => {
    if (!cameraEntityRef.current || !presetTransitionRef.current) return;

    const transition = presetTransitionRef.current;
    const elapsed = performance.now() - transition.startTime;
    const t = Math.min(1, elapsed / transition.duration);
    const eased = 1 - Math.pow(1 - t, 3);

    const pos = transition.from.position.map((v: number, i: number) => v + (transition.to.position[i] - v) * eased);
    const rot = transition.from.rotation.map((v: number, i: number) => v + (transition.to.rotation[i] - v) * eased);

    cameraEntityRef.current.setLocalPosition(pos[0], pos[1], pos[2]);
    cameraEntityRef.current.setLocalEulerAngles(rot[0], rot[1], rot[2]);

    if (t >= 1) {
      presetTransitionRef.current = null;
    }
  });

  if (error) {
    return (
      <div style={{ padding: 20, color: '#ff6b6b', textAlign: 'center' }}>
        Failed to load 3D model: {String(error)}
      </div>
    );
  }

  if (loading || !asset) {
    return (
      <div style={{ padding: 20, color: '#888', textAlign: 'center' }}>
        Loading 3D model...
      </div>
    );
  }

  return (
    <>
      <Entity name="sky">
        <Script script={ProceduralSky} luminance={0.15} />
      </Entity>

      <Entity name="camera" ref={cameraEntityRef} position={cameraPreset?.position ?? [8, 5, 10]} rotation={cameraPreset?.rotation ?? [-20, 45, 0]}>
        <Camera
          toneMapping={TONEMAP_ACES2}
          exposure={1}
          fov={60}
          nearClip={0.1}
          farClip={100}
          clearColor={0x1a1a2e}
        />
        <Script script={CameraControls} sceneSize={15} distance={15} minDistance={2} maxDistance={50} />
      </Entity>

      <Entity name="sun" rotation={[-45, 30, 0]}>
        <LightWithColor
          type="directional"
          color="#fff8e7"
          intensity={2.5}
          castShadows={performanceMode === 'HIGH'}
          shadowDistance={30}
          shadowResolution={performanceMode === 'HIGH' ? 2048 : 1024}
          shadowBias={0.005}
          normalOffsetBias={0.002}
        />
      </Entity>

      <Entity name="fill-light" rotation={[45, -30, 0]}>
        <LightWithColor
          type="directional"
          color="#88aaff"
          intensity={0.5}
          castShadows={false}
        />
      </Entity>

      <Container
        ref={containerRef}
        asset={asset}
        onClick={handleEntityClick}
        onLoad={(container: any) => applyViewSettings(container)}
      />
    </>
  );
}

function isWallOrRoof(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('wall') ||
    lower.includes('roof') ||
    lower.includes('ceiling') ||
    lower.includes('floor') ||
    lower.includes('partition') ||
    lower.includes('exterior') ||
    lower.includes('dormer');
}

function isPipe(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('pipe') ||
    lower.includes('tube') ||
    lower.includes('mainpipe') ||
    lower.includes('branch') ||
    lower.includes('valve');
}

function isSensorOrValve(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('mq2') ||
    lower.includes('sensor') ||
    lower.includes('valve') ||
    lower.includes('led') ||
    lower.includes('buzzer') ||
    lower.includes('auto');
}

function setEntityOpacity(entity: any, opacity: number) {
  entity.render?.meshInstances?.forEach((mi: any) => {
    if (mi.material) {
      mi.material.opacity = opacity;
      mi.material.blendType = opacity < 1 ? 1 : 0;
      mi.material.depthWrite = opacity >= 1;
      mi.material.update();
    }
  });
}

function setEntityEmissive(entity: any, intensity: number) {
  entity.render?.meshInstances?.forEach((mi: any) => {
    if (mi.material) {
      mi.material.emissive.set(intensity, intensity, intensity);
      mi.material.update();
    }
  });
}

export function useScene3D() {
  const containerRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const appRef = useRef<any>(null);

  const setContainerRef = (container: any) => {
    containerRef.current = container;
  };

  const setCameraRef = (entity: any) => {
    cameraRef.current = entity;
  };

  const setAppRef = (app: any) => {
    appRef.current = app;
  };

  const findEntityByName = (name: string): any => {
    if (!containerRef.current) return null;
    let found: any = null;
    containerRef.current.traverse((entity: any) => {
      if (entity.name === name) found = entity;
    });
    return found;
  };

  const findEntitiesByPattern = (pattern: string): any[] => {
    if (!containerRef.current) return [];
    const regex = new RegExp(pattern, 'i');
    const found: any[] = [];
    containerRef.current.traverse((entity: any) => {
      if (regex.test(entity.name)) found.push(entity);
    });
    return found;
  };

  const getObjectRefs = (): SceneObjectRefs => {
    const refs: SceneObjectRefs = {
      gasSensors: {},
      pressureSensors: {},
      valves: {},
      pipes: {},
      indicators: {},
    };

    if (!containerRef.current) return refs;

    containerRef.current.traverse((entity: any) => {
      const name = entity.name;

      if (name.startsWith('SIGAS_MQ2') || name.startsWith('GS')) {
        const zone = name.includes('Z1') || name.includes('GS1') ? 'Z1' :
          name.includes('Z2') || name.includes('GS2') ? 'Z2' : 'Z3';
        refs.gasSensors[zone] = entity;
      } else if (name.startsWith('SIGAS_P') || name.startsWith('P')) {
        const zone = name.includes('P0') ? 'P0' :
          name.includes('P1') ? 'P1' :
            name.includes('PK') ? 'PK' :
              name.includes('PL') ? 'PL' : 'PT';
        refs.pressureSensors[zone] = entity;
      } else if (name.startsWith('SIGAS_V') || name.startsWith('VM') || name.startsWith('VK') || name.startsWith('VL') || name.startsWith('VT')) {
        const valve = name.includes('VM') ? 'VM' :
          name.includes('VK') ? 'VK' :
            name.includes('VL') ? 'VL' : 'VT';
        refs.valves[valve] = entity;
      } else if (name.includes('Pipe') || name.includes('pipe') || name.includes('MainPipe')) {
        refs.pipes[name] = entity;
      } else if (name.includes('Led') || name.includes('LED') || name.includes('Buzzer') || name.includes('buzzer')) {
        refs.indicators[name] = entity;
      }
    });

    return refs;
  };

  return {
    containerRef: setContainerRef,
    cameraRef: setCameraRef,
    appRef: setAppRef,
    findEntityByName,
    findEntitiesByPattern,
    getObjectRefs,
  };
}
