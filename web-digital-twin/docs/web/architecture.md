# Arquitectura del SIGAS-RT Web Digital Twin

## Visión General

El Web Digital Twin es una aplicación React + PlayCanvas que visualiza en tiempo real el estado del sistema SIGAS-RT. Está diseñado para funcionar **offline** con un simulador MOCK determinista, y prepararse para conexión **LIVE** con MATLAB vía bridge UDP/WebSocket.

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (React + PlayCanvas)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Telemetry  │    │  DigitalTwin │    │    Scene3D   │      │
│  │   Sources    │───▶│    Store     │───▶│  (PlayCanvas)│      │
│  │              │    │  (Zustand)   │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        ▲                   │                   │                │
│        │                   ▼                   ▼                │
│        │            ┌──────────────┐    ┌──────────────┐      │
│        │            │    UI/UX     │    │  Animations  │      │
│        │            │  Components  │    │  (Valves,    │      │
│        │            │              │    │   Gas Leak)  │      │
│        │            └──────────────┘    └──────────────┘      │
│        │                                                        │
│        │              ┌──────────────┐                          │
│        └──────────────│    Replay    │                          │
│                       │   Manager    │                          │
│                       └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ WebSocket (45811)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NODE.JS BRIDGE (Opcional)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   UDP Server │    │  Transform   │    │  WebSocket   │      │
│  │  (Port 45810)│───▶│  & Validate  │───▶│  Server      │      │
│  └──────────────┘    └──────────────┘    │  (Port 45811)│      │
│                                            └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ UDP (45810)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MATLAB / SIMULINK                       │
├─────────────────────────────────────────────────────────────────┤
│  Emisor UDP personalizado (por implementar)                    │
│  Envía frames JSON schema V2 cada ~33ms (30 Hz)                │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Fuentes de Telemetría

```
TelemetrySource (MOCK_SIM | MATLAB_SIM | RECORDED_REPLAY)
         │
         ▼
    ┌─────────────────────────────────────┐
    │         Parser / Validator          │
    │  validateTelemetryFrame(rawData)    │
    │  Returns: ValidatedTelemetry | null │
    └─────────────────────────────────────┘
         │
         ▼ (solo frames válidos)
    ┌─────────────────────────────────────┐
    │      DigitalTwinStore (Zustand)     │
    │  - latestFrame: ValidatedTelemetry  │
    │  - frameHistory: ValidatedTelemetry[]│
    │  - connectionStatus: LIVE/STALE/... │
    │  - currentSource: TelemetrySource   │
    │  - replay state, performance, UI    │
    └─────────────────────────────────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Scene3D │    │ Dashboard│   │ Charts  │    │ Replay  │
    │ (3D)    │    │ (HUD)   │    │ (Live)  │    │ (Time)  │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 2. Validación Estricta

Nunca se confía en datos entrantes. Cada frame pasa por `validateTelemetryFrame()`:

- ✅ `schemaVersion === 2`
- ✅ `source` en enum conocido
- ✅ `sequence`, `simTime`, `timestamp` finitos
- ✅ `systemState` en enum conocido
- ✅ `eventType` en enum conocido
- ✅ `affectedZoneMask` finito
- ✅ `gas.Z1/Z2/Z3` estructura completa (adc finite, level enum, valid boolean)
- ✅ `pressure.P0/P1/PK/PL/PT` finitos
- ✅ `flow.main/living` finitos
- ✅ `valves.VM/VK/VL/VT` en enum OPEN/CLOSED
- ✅ `buzzer/greenLed/redLed` booleanos

Frames inválidos → **rechazados silenciosamente**, no actualizan store.

### 3. Connection Status

```
lastValidFrameTime ──▶ getConnectionStatus(now) ──▶ LIVE | STALE | DISCONNECTED
                              │
                    LIVE: < 1500ms
                    STALE: 1500-2999ms
                    DISCONNECTED: ≥ 3000ms
```

**Importante**: En STALE/DISCONNECTED se conserva último dato PERO no se infiere NORMAL/SAFE/OPEN.

## Componentes Principales

### Scene3D (PlayCanvas)

```
Application
├── Sky (ProceduralSky, luminance=0.15)
├── Camera (CameraControls, ACES2 tone mapping)
│   └── Presets: EXTERIOR, COCINA, LIVING, ÁREA_TÉCNICA, MANIFOLD, VISTA_SUPERIOR, XRAY
├── Sun Light (Directional, shadows en HIGH)
├── Fill Light (Directional, no shadows)
└── Container (GLB model)
    ├── Meshes por material (18 draw calls)
    ├── Animación válvulas (rotación 0°→-90°, 400ms)
    ├── Efecto fuga gas (partículas sprite, 30 por zona)
    └── Click handler → selectObject(name)
```

**Optimización de materiales por vista**:
- **CASA**: Opacidad 1.0, depthTest true
- **XRAY**: Paredes/techo opacity 0.15, depthTest false, blend
- **TUBERÍAS**: Tuberías opacity 1.0 + emissive, paredes 0.3
- **PRESIÓN**: Tuberías opacity 1.0, paredes 0.4
- **SEGURIDAD**: Sensores/válvulas opacity 1.0 + emissive, paredes 0.4

### DigitalTwinStore (Zustand)

Estado central con selectores optimizados:

```typescript
// Estado
latestFrame, previousFrame, frameHistory[]
lastValidFrameTime, connectionStatus
currentSource
isReplaying, replaySpeed, replayFrames[], replayIndex
performanceMode, fps, frameTime
selectedObject, activeView, activeCameraPreset, showDevPanel

// Acciones
setTelemetryFrame(frame)  // + history + connection status
setSource(source)
updateConnectionStatus(now)
setReplayFrames(frames)
setReplaying(playing)
setReplaySpeed(speed)
setReplayIndex(index)
tickReplay()  // para replay automático
setPerformanceMode(mode)
updatePerformanceMetrics(fps, frameTime)
selectObject(id)
setActiveView(view)
setActiveCameraPreset(preset)
toggleDevPanel()
reset()

// Selectores (memoizados)
selectLatestFrame, selectConnectionStatus, selectSystemState...
```

### MockSimulator

Simulador determinista TypeScript con 10 escenarios:

```typescript
class MockSimulator {
  setScenario(name: ScenarioName)
  setTimeScale(scale: number)  // 0.1x - 4x
  start() / stop()
  tick()  // requestAnimationFrame loop
}
```

Escenarios definidos como pasos temporales con interpolación lineal entre estados.

### ReplayManager

```typescript
// Grabación
startRecording(onFrameRecorded?)
stopRecording() → ReplaySession
recordFrame(frame)

// Reproducción
ReplayPlayer
  loadSession(session)
  play() / pause() / stop()
  seek(index)
  setSpeed(speed)
  onFrame(frame, index, total)
  onEnd()
```

Formatos: JSON (array) y JSON Lines.

## Modos de Rendimiento

| Config | LOW | MEDIUM | HIGH | AUTO |
|--------|-----|--------|------|------|
| Pixel Ratio | 1.0 | 1.5 | 2.0 | Detecta |
| Shadows | Off | Limited | On | Conservador |
| Particles | Min | Normal | Full | - |
| Post-FX | Off | Off | Optional | - |
| Textures | Reduced | Normal | Full | - |

Detección AUTO: `navigator.deviceMemory`, `navigator.hardwareConcurrency`, WebGL renderer info.

## Seguridad y Validación

- **No comandos a actuadores**: La web es solo visualización
- **Validación estricta**: Todos los frames validados antes de store
- **No secrets en cliente**: Token Wokwi solo en env var servidor
- **CSP ready**: `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Opener-Policy: same-origin`
- **HTTPS only en producción**: Requerido para WebGPU

## Extensibilidad

### Agregar Nuevo Escenario MOCK

1. Añadir entrada en `scenarios` object en `mockSimulator.ts`
2. Definir `steps[]` con `time`, `duration`, overrides de estado
3. `totalDuration` y `loop` boolean
4. Se integra automáticamente en `ScenarioPanel`

### Agregar Nueva Vista 3D

1. Añadir a `VIEWS` array en `Panels.tsx`
2. Implementar lógica en `Scene3D.tsx` → `applyViewSettings()`
3. Usar `isWallOrRoof()`, `isPipe()`, `isSensorOrValve()` helpers

### Agregar Nuevo Gráfico Live

1. Añadir config en `CHART_CONFIGS` en `Charts.tsx`
2. Definir `extractor(frame) => number | null`
3. `min`, `max`, `unit`, `color`, `label`

### Conectar MATLAB LIVE

1. Implementar `Bridge.startRealMode()` en `bridge.ts`
2. UDP server en puerto 45810
3. Parse JSON → `validateTelemetryFrame()` → broadcast WebSocket
4. WebSocket server en puerto 45811
5. Cliente React: `bridge.addEventListener()` → `setTelemetryFrame()`

## Deployment

### Vercel (Frontend Estático)

```bash
npm run build
# dist/ → deploy a Vercel
```

Funciona con: `RECORDED_REPLAY` + `MOCK_SIM` (browser-side).

**MATLAB LIVE requiere**: Bridge local o infraestructura WebSocket proxy.

### LAN Demo

```bash
npm run dev:lan
# Vite --host 0.0.0.0
# Accesible desde móvil en misma red
```

### PWA (Opcional)

`vite-plugin-pwa` para instalable offline. Secundario, no bloquea MVP.

## Build Gates

```bash
npm run lint      # ESLint (PlayCanvas config)
npm run typecheck # tsc --noEmit
npm run test      # Vitest (unit + mock + replay)
npm run build     # Vite production build
```

Todos deben **PASS** antes de commit.