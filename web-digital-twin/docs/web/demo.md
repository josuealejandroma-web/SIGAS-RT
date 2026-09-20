# Guía de Demostración - SIGAS-RT Web Digital Twin

## Demo Rápida (30 segundos)

```powershell
cd web-digital-twin
npm run dev
```
1. Abre http://localhost:5173
2. Click **FULL DEMO** en panel ESCENARIOS
3. Observa secuencia completa 45s

## Escenarios Detallados

### 1. NORMAL (Operación Estable)
- **Duración**: 10s (loop)
- **Estado**: NORMAL todo el tiempo
- **Vista recomendada**: CASA → EXTERIOR
- **Verificar**: Gas Z1/Z2/Z3 = NORMAL (ADC ~800), Presiones estables, Válvulas OPEN, LED Verde ON

### 2. FUGA COCINA (Gas Leak Kitchen)
- **Duración**: 15s
- **Secuencia**:
  - 0-3s: NORMAL
  - 3-7s: WARNING → GS1 ADC sube 2800 (WARNING)
  - 7-12s: CRITICAL → GS1 ADC 3800, **VK CIERRA**, Buzzer ON, LED Rojo ON
  - 12-15s: SAFE_LATCHED (bloqueado seguro)
- **Vista recomendada**: COCINA + SEGURIDAD
- **Click GS1**: Ver ADC, nivel, proxy simulado

### 3. FUGA ÁREA TÉCNICA (Gas Leak Technical)
- **Duración**: 15s
- **Similar a cocina** pero GS2 y **VT CIERRA**
- **Vista**: ÁREA TÉCNICA + SEGURIDAD

### 4. FUGA LIVING (Gas Leak Living)
- **Duración**: 15s
- **GS3** sube, **VL CIERRA**
- **Vista**: LIVING + SEGURIDAD

### 5. ROTURA LIVING (Pipe Rupture Living) ⭐ ESCENARIO CLAVE
- **Duración**: 20s
- **Secuencia visual crítica**:
  - 0-2s: NORMAL
  - 2-4s: GS3 sube (1200), **PL cae a 14**, flow Living sube a 3
  - 4-7s: **WARNING** → PL 8, flow 8, GS3 WARNING
  - 7-11s: **CRITICAL** → PL 3, flow 15, GS3 CRITICAL, **VL CIERRA** (animación), Buzzer + LED Rojo
  - 11-16s: **SAFE_LATCHED** → PL 1, flow 0.5
  - 16-20s: PL 0.5, GS3 bajando
- **Vista obligatoria**: TUBERÍAS + PRESIÓN + LIVING camera
- **Efectos visuales**:
  - Living resaltado (emissive)
  - Partículas fuga en Living
  - Tubería Living pulsa (animación)
  - Gráfico PL desciende en tiempo real
  - Banner: "PIPE RUPTURE DETECTED - LIVING ISOLATED - SAFE_LATCHED"

### 6. FALSO PICO PRESIÓN (False Pressure Spike)
- **Duración**: 10s
- **P1 spike a 35 mbar** → flow main 12 → **sin actuación crítica** → vuelve NORMAL
- **Vista**: MANIFOLD/MEDIDOR + PRESIÓN
- **Verificar**: Sistema NO cierra válvulas, solo WARNING temporal

### 7. FALLO SENSOR PRESIÓN (Pressure Sensor Failure)
- **Duración**: 10s
- **PL = 0** → FAULT → **VL CIERRA** por seguridad
- **Vista**: PRESIÓN + SEGURIDAD
- **Click PL**: Ver status "LOW/FAULT", source

### 8. FALLO SENSOR GAS Z3 (Gas Sensor Failure Z3)
- **Duración**: 10s
- **GS3 ADC = 0, valid = false** → FAULT → **VL CIERRA**
- **Vista**: LIVING + SEGURIDAD
- **Click GS3**: Ver "INVALID", FAULT

### 9. MULTIZONA (Multi-Zone Leak)
- **Duración**: 20s
- **GS1 + GS2 + GS3** suben simultáneo
- **VK + VT + VL CIERRAN** en cascada
- **Vista**: VISTA SUPERIOR + XRAY + SEGURIDAD

### 10. FULL DEMO (Demo Completa 45s) ⭐ PARA PRESENTACIONES
```
0-5s    NORMAL estable
5-8s    FALSO PICO (P1 spike) → sin actuación
8-10s   Recuperación NORMAL
10-15s  FUGA COCINA → WARNING → VK CIERRA → SAFE_LATCHED
15-18s  RESET → NORMAL (VK abre)
18-21s  Estable
21-23s  INICIO ROTURA LIVING (PL↓, flow↑, GS3↑)
23-26s  WARNING → PIPE_RUPTURE
26-30s  CRITICAL → VL CIERRA → Buzzer + Rojo
30-35s  SAFE_LATCHED
35-40s  Estable SAFE_LATCHED
40-45s  Fin
```

## Controles de Demostración

### Vistas (Botones Superiores)
| Botón | Uso en Demo |
|-------|-------------|
| **CASA** | Contexto general, inicio |
| **XRAY** | Ver tuberías internas durante rotura |
| **TUBERÍAS** | **CRÍTICO** para rotura - ver PL, VL, flow |
| **PRESIÓN** | Ver barras PL descendiendo en rotura |
| **SEGURIDAD** | Ver GS3, VL, estado sistema, buzzer, LEDs |

### Cámara (Selector Dropdown)
| Preset | Cuándo Usar |
|--------|-------------|
| EXTERIOR | Inicio demo, contexto |
| COCINA | Fuga cocina (GS1, VK) |
| LIVING | **Rotura living** (GS3, VL, PL) |
| ÁREA TÉCNICA | Fuga técnica (GS2, VT) |
| MANIFOLD/MEDIDOR | Presiones P0, P1, VM, VK |
| VISTA SUPERIOR | Multizona, XRAY |
| XRAY | Tuberías internas, ver aislamiento |

### Escenarios (Panel Lateral)
- **MOCK_SIM**: Botones activos, cambian simulador
- **MATLAB_SIM**: Botones deshabilitados ("CONTROLLED BY MATLAB")
- **REPLAY**: Controles replay activos

### Replay (Controles Inferiores)
- **Play/Pause**: ▶ / ⏸
- **Seek bar**: Arrastra para saltar en tiempo
- **Speed**: 0.5x / 1x / 2x
- **Timeline**: Click en eventos para saltar

## Checklist de Verificación Visual

### Por Vista

#### CASA
- [ ] Casa renderizada completa
- [ ] Iluminación suave, sin sombras duras (MEDIUM)
- [ ] Camera orbit suave (click+drag)
- [ ] Presets de cámara transicionan 800ms ease-out

#### XRAY
- [ ] Paredes/techo semi-transparentes (opacity ~0.15)
- [ ] Tuberías visibles a través de paredes
- [ ] Sensores y válvulas visibles
- [ ] Depth test off en transparentes

#### TUBERÍAS
- [ ] Casa atenuada (opacity 0.3-0.5)
- [ ] Tuberías resaltadas (emissive 0.3)
- [ ] Etiquetas: VM, VK, VL, VT, P0, P1, PK, PL, PT visibles
- [ ] Ramales diferenciados (color/material)

#### PRESIÓN
- [ ] Intensidad tuberías = presión relativa
- [ ] Etiquetas mbar en P0, P1, PK, PL, PT
- [ ] Escala configurable (no normativa)
- [ ] Gráfico PL en Charts sincronizado

#### SEGURIDAD
- [ ] GS1, GS2, GS3 con estado (icono + texto + color)
- [ ] VM, VK, VL, VT con estado
- [ ] Estado sistema prominente
- [ ] Buzzer, LED Verde, LED Rojo
- [ ] Alarma visible si CRITICAL/SAFE_LATCHED

### Por Escenario

#### ROTURA LIVING (Verificación Completa)
- [ ] **0-2s**: NORMAL, todo verde
- [ ] **2-4s**: GS3 ADC sube, PL baja, flow Living sube
- [ ] **4-7s**: WARNING (amarillo), GS3 WARNING
- [ ] **7-11s**: 
  - [ ] CRITICAL (rojo)
  - [ ] Partículas fuga aparecen en Living
  - [ ] Tubería Living pulsa (animación)
  - [ ] Gráfico PL cae en tiempo real
  - [ ] VL rota a CLOSED (animación 400ms)
  - [ ] Buzzer ON (icono 🔊 activo)
  - [ ] LED Rojo ON (🔴 activo)
  - [ ] LED Verde OFF
- [ ] **11-16s**: SAFE_LATCHED (🔒 SEGURO BLOQUEADO)
- [ ] **Banner superior**: "PIPE RUPTURE DETECTED - LIVING ISOLATED - SAFE_LATCHED"
- [ ] **Timeline**: Marcadores WARNING, CRITICAL, PIPE_RUPTURE, VALVE_CLOSE, SAFE_LATCHED clickeables

#### FULL DEMO
- [ ] Secuencia completa 45s sin errores
- [ ] Transiciones suaves entre fases
- [ ] Reset correcto (vuelven a OPEN, LEDs normal)
- [ ] Source badge siempre "🧪 MOCK SIM"

### Por Interacción

#### Click en Objetos
- [ ] **GS1/GS2/GS3**: Panel muestra ADC, nivel, proxy, valid, freshness
- [ ] **P0-PT**: Panel muestra presión mbar, status, zona, source
- [ ] **VM/VT/VK/VL**: Panel muestra STATE, UPSTREAM, DOWNSTREAM, DELTA, REASON, AFFECTED ZONE
- [ ] Panel se cierra con ✕ o click fuera

#### Accesibilidad
- [ ] Estados con **icono + texto + color** (no solo color)
- [ ] Focus visible en todos botones (Tab)
- [ ] `prefers-reduced-motion` desactiva transiciones
- [ ] Contraste WCAG AA en texto

## Scripts de Demo Automatizada

### Headless Test (CI)
```bash
npm run test
# Ejecuta tests unitarios + validación frames
```

### Visual Regression (Manual)
```bash
npm run dev
# 1. Cargar cada vista
# 2. Ejecutar cada escenario
# 3. Capturar screenshots (PlayCanvas screenshot API)
# 4. Comparar con baseline
```

### Performance Check
```bash
npm run dev
# Abrir DevPanel (🛠)
# Ejecutar FULL DEMO
# Verificar: FPS ≥ 30, Frame Time ≤ 33ms en LOW mode
```

## Troubleshooting Demo

| Problema | Solución |
|----------|----------|
| Modelo no carga | Verificar `public/models/sigas_house_web.glb` existe |
| Escenario no inicia | Verificar consola: `MockSimulator` logs |
| Animación válvula no se ve | Verificar `SIGAS_AutoValve` en modelo, animación 1s |
| Partículas no aparecen | Verificar `performanceMode` no sea LOW, o particle count > 0 |
| Gráficos vacíos | Verificar `frameHistory` tiene datos, `simTime` avanza |
| Timeline vacío | Cargar replay o ejecutar escenario completo |
| Camera no transiciona | Verificar `CameraPresetSelector` valor, `CAMERA_PRESETS` array |

## Grabación de Demo (Para Documentación)

```bash
# Opción 1: Screen recording (OBS, Windows Game Bar)
# Opción 2: PlayCanvas screenshot sequence
# Opción 3: Puppeteer headless

# Ejemplo Puppeteer:
npx puppeteer --script record-demo.js
```

### Script Puppeteer Básico

```javascript
// record-demo.js
const puppeteer = require('puppeteer');

await (async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForSelector('#sigas-canvas');
  
  // Esperar carga modelo
  await page.waitForFunction(() => !document.querySelector('#sigas-canvas').style.display === 'none');
  
  // Ejecutar FULL DEMO
  await page.click('button:has-text("FULL DEMO")');
  
  // Grabar 50s
  await new Promise(r => setTimeout(r, 50000));
  
  await browser.close();
})();
```

## Checklist Pre-Presentación

- [ ] `npm run build` exitoso
- [ ] `npm run test` PASS
- [ ] `npm run dev` carga en < 3s
- [ ] Modelo optimizado cargado (18 draw calls)
- [ ] FULL DEMO ejecutado completo sin errores
- [ ] ROTURA LIVING verificado visualmente
- [ ] Todas las vistas funcionales
- [ ] Panel detalle click funciona
- [ ] Replay controles funcionales
- [ ] DevPanel muestra FPS > 30
- [ ] Accesibilidad: iconos + texto + color
- [ ] Responsive: tablet/mobile layouts
- [ ] Documentación actualizada

---

**Demo Final Exitosa** = FULL DEMO 45s completa + ROTURA LIVING verificada + todas las vistas funcionales.