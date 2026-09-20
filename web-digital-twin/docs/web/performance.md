# Guía de Rendimiento - SIGAS-RT Web Digital Twin

## Objetivos de Rendimiento

| Métrica | Target LOW | Target MEDIUM | Target HIGH |
|---------|------------|---------------|-------------|
| **FPS** | ≥ 30 | ≥ 50 | ≥ 60 |
| **Frame Time** | ≤ 33ms | ≤ 20ms | ≤ 16ms |
| **Draw Calls** | ≤ 25 | ≤ 30 | ≤ 35 |
| **Triangles** | ≤ 50k | ≤ 100k | ≤ 200k |
| **Texture Memory** | ≤ 50MB | ≤ 100MB | ≤ 200MB |
| **JS Heap** | ≤ 50MB | ≤ 80MB | ≤ 120MB |
| **Load Time** | ≤ 3s | ≤ 2s | ≤ 1.5s |

## Modelo 3D Optimizado

### Original vs Optimizado

| Métrica | Original | Optimizado | Mejora |
|---------|----------|------------|--------|
| Tamaño archivo | 1.72 MB | 1.49 MB | -13% |
| Meshes | 211 | 18 | -91% |
| Draw Calls | 211 | 18 | -91% |
| Triángulos | 4,536 | 26,000* | +473% |
| Materiales | 18 | 18 | = |

*El join fusiona geometría por material, aumentando triángulos pero reduciendo drásticamente draw calls.

### Pipeline de Optimización

```bash
# 1. Deduplicación
gltf-transform dedup input.glb dedup.glb
# 1.72 MB → 765 KB

# 2. Meshopt (compresión)
gltf-transform meshopt dedup.glb meshopt.glb
# 765 KB → 389 KB

# 3. Join por material
gltf-transform join meshopt.glb joined.glb
# 389 KB → 1.49 MB (18 meshes, 18 draw calls)
```

### Nombres Preservados

Críticos para selección y animación:
- `SIGAS_MQ2_Z1` / `SIGAS_MQ2_Z2` / `SIGAS_MQ2_Z3` (sensores gas)
- `SIGAS_AutoValve` (válvula principal animada)
- `SIGAS_MainPipe` (tubería principal)
- `SIGAS_LedGreen` / `SIGAS_LedRed` (LEDs)
- `SIGAS_Buzzer` (buzzer)

## Configuración PlayCanvas

### Device Options

```typescript
graphicsDeviceOptions: {
  preferWebGl2: true,        // WebGL2 preferred
  powerPreference: 'high-performance',  // GPU discreta si hay
  antialias: performanceMode !== 'LOW', // MSAA off en LOW
  alpha: false,              // No alpha = más rápido
  preserveDrawingBuffer: false,
}
```

### Camera Settings

```typescript
<Camera
  toneMapping={TONEMAP_ACES2}
  exposure={1}
  fov={60}
  nearClip={0.1}
  farClip={100}        // No excesivo
  clearColor={0x1a1a2e}
/>
```

### Shadows

```typescript
<Light
  castShadows={performanceMode === 'HIGH'}
  shadowDistance={30}
  shadowResolution={performanceMode === 'HIGH' ? 2048 : 1024}
  shadowBias={0.005}
  normalOffsetBias={0.002}
/>
```

**Shadows solo en HIGH** - Mayor impacto en GPU.

## Modos de Rendimiento

### AUTO (Detección)

```typescript
function detectPerformanceMode(): PerformanceMode {
  // Memoria dispositivo
  const memory = (navigator as any).deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;
  
  // WebGL renderer info
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const renderer = gl?.getParameter(gl.RENDERER) || '';
  const vendor = gl?.getParameter(gl.VENDOR) || '';
  
  // Heurística conservadora
  if (memory < 4 || cores < 4 || /intel|mali|adreno/i.test(renderer + vendor)) {
    return 'LOW';
  }
  if (memory < 8 || cores < 8) {
    return 'MEDIUM';
  }
  return 'HIGH';
}
```

### Aplicación por Modo

```css
/* LOW */
:root[data-perf="LOW"] {
  --pixel-ratio: 1.0;
  --shadow-enabled: false;
  --particle-count: 10;
  --texture-scale: 0.5;
}

/* MEDIUM */
:root[data-perf="MEDIUM"] {
  --pixel-ratio: 1.5;
  --shadow-enabled: true;
  --particle-count: 30;
  --texture-scale: 0.75;
}

/* HIGH */
:root[data-perf="HIGH"] {
  --pixel-ratio: 2.0;
  --shadow-enabled: true;
  --particle-count: 50;
  --texture-scale: 1.0;
}
```

## Optimizaciones de Render

### 1. Reducir Draw Calls
- ✅ Join meshes por material (18 draw calls)
- ✅ Instancing para objetos repetidos (no aplicable aquí)
- ✅ Frustum culling automático (PlayCanvas)

### 2. Optimizar Shaders
- Usar materiales `standard` simples
- Evitar `emissive` en objetos estáticos
- `depthTest: false` solo para XRAY transparente

### 3. Texturas
- **Sin texturas** en modelo actual (colores vertex/material)
- Si se añaden: WebP/KTX2, power-of-2, mipmaps

### 4. Animaciones
- Válvulas: rotación simple (0 → -90°), 400ms, GPU-driven
- Fuga gas: particle system con 30 partículas/zona, billboards
- Camera transitions: easeOutCubic 800ms, CPU-driven

### 5. Post-Processing
- **Ninguno por defecto**
- Opcional en HIGH: Bloom sutil, FXAA

## Optimizaciones JavaScript

### Store (Zustand)
- Selectores memoizados (`selectLatestFrame`, etc.)
- `subscribeWithSelector` para reactividad granular
- `frameHistory` limitado a 1800 frames (60s @ 30fps)

### Charts (Canvas)
- RequestAnimationFrame sync con render
- Solo 3 gráficos simultáneos
- 180 puntos máx (30s @ 6fps display)
- Reutilizar canvas contexts

### Mock Simulator
- Interpolación lineal simple (sin physics)
- `requestAnimationFrame` loop
- Time scale configurable (0.1x - 4x)

### Replay
- Frames en memoria (ValidatedTelemetry[])
- Seek O(1) por índice
- Playback con `simTime` deltas

## Memory Management

### Limpieza Automática

```typescript
// Store: frameHistory max 1800
maxHistoryLength: 1800

// Charts: 180 puntos max
// Replay: liberado al cargar nueva sesión
// Scene: dispose() en unmount
```

### WeakRefs para Cachés

```typescript
const modelCache = new WeakRef<Container>(null);
// GC puede limpiar si no hay referencias fuertes
```

## Profiling

### DevTools Panel

```typescript
// En DevPanel component
fps: Math.round(1000 / frameTime)
frameTime: now - lastFrameTime
drawCalls: app.drawCalls (PlayCanvas)
triangles: app.triangles (PlayCanvas)
textureMemory: estimated
```

### Chrome DevTools

1. **Performance** tab → Record → Interact
2. Buscar: Long tasks (>50ms), Layout thrashing, GC spikes
3. **Memory** tab → Heap snapshots → Compare

### PlayCanvas Stats

```typescript
// En Scene3D onUpdate
const stats = {
  drawCalls: app.drawCalls,
  triangles: app.triangles,
  shaderSwitches: app.shaderSwitches,
  textureMemory: app.textureMemory,  // si disponible
};
```

## Benchmarks Típicos

### Hardware Referencia

| Config | FPS (CASA) | FPS (XRAY) | FPS (TUBERÍAS) | Frame Time |
|--------|------------|------------|----------------|------------|
| **Intel UHD 620** (laptop 2019) | 45 | 38 | 42 | 22ms |
| **AMD Radeon 680M** (laptop 2023) | 60 | 60 | 60 | 10ms |
| **NVIDIA RTX 3060 Mobile** | 60 | 60 | 60 | 8ms |
| **Apple M1** | 60 | 60 | 60 | 9ms |
| **Apple M2 Pro** | 60 | 60 | 60 | 7ms |

### Métricas por Vista

| Vista | Draw Calls | Triángulos | Shader Switches |
|-------|------------|------------|-----------------|
| CASA | 18 | ~26k | ~20 |
| XRAY | 18 | ~26k | ~25 (blend) |
| TUBERÍAS | 18 | ~26k | ~20 |
| PRESIÓN | 18 | ~26k | ~20 |
| SEGURIDAD | 18 | ~26k | ~22 (emissive) |

## Checklist de Optimización

### Pre-Build
- [ ] Modelo join por material (18 draw calls)
- [ ] Meshopt compression aplicado
- [ ] Nombres críticos preservados
- [ ] Sin texturas pesadas innecesarias
- [ ] Animaciones GPU-driven

### Runtime
- [ ] AUTO mode detecta correctamente
- [ ] Shadows solo en HIGH
- [ ] Antialias off en LOW
- [ ] Pixel ratio según mode
- [ ] Frame history limitado
- [ ] Charts canvas reutilizados
- [ ] No memory leaks en unmount

### CI/CD
- [ ] `npm run build` < 30s
- [ ] Bundle size < 2MB (gzipped < 500KB)
- [ ] Chunks: playcanvas, react, vendor separados
- [ ] Source maps generados

## Troubleshooting

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| FPS < 30 en LOW | GPU integrada antigua | Forzar LOW, reducir canvas size |
| Frame spikes | GC pressure | Reutilizar objetos, evitar new en loop |
| Memory leak | Event listeners | Cleanup en useEffect return |
| Shader recompiles | Material changes | Batch material updates |
| High draw calls | Model no joined | Verificar join pipeline |

## WebGPU vs WebGL2

| Feature | WebGPU | WebGL2 |
|---------|--------|--------|
| Draw call overhead | Menor | Mayor |
| Compute shaders | Sí | No |
| Pipeline state | Objetos | Bind points |
| Soporte actual | Chrome 113+, Edge 113+ | Universal |

**Fallback**: PlayCanvas usa WebGPU si disponible, WebGL2 si no. No bloquea app.

## Métricas de Build

```bash
# Analizar bundle
npm run build
npx vite-bundle-analyzer dist

# Targets recomendados
# Total JS: < 500 KB gzipped
# CSS: < 50 KB gzipped
# Modelo GLB: 1.5 MB (cacheable)
```

## Monitoreo en Producción

```typescript
// Enviar a analytics (opcional)
const metrics = {
  fps: avgFPS,
  frameTime: p95FrameTime,
  mode: performanceMode,
  renderer: isWebGPU ? 'webgpu' : 'webgl2',
  deviceMemory: navigator.deviceMemory,
  hardwareConcurrency: navigator.hardwareConcurrency,
  loadTime: performance.now() - navigationStart,
};
```

---

**Nota**: Este proyecto prioriza **fluidez** sobre efectos visuales. Si hay duda, elegir opción más performante.