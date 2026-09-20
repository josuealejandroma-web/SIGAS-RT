# SIGAS-RT Web Digital Twin

Sistema Inteligente de Detección y Corte Automático de Gas en Tiempo Real — Gemelo Digital Web 3D.

## Stack Tecnológico

- **React 19** + **TypeScript** + **Vite**
- **@playcanvas/react** + **PlayCanvas Engine** (WebGPU/WebGL2)
- **Zustand** para estado global
- **Vitest** para testing
- **ESLint** + **Prettier** para calidad de código

## Estructura del Proyecto

```
web-digital-twin/
├── public/
│   ├── models/
│   │   ├── sigas_house_original.glb    # Modelo original (1.7 MB)
│   │   ├── sigas_house_web.glb         # Modelo optimizado para web
│   │   └── ... (intermediate optimization steps)
│   ├── textures/
│   └── replay/
├── src/
│   ├── app/                    # App principal
│   ├── components/             # Componentes React genéricos
│   ├── scene/                  # Escena 3D (PlayCanvas)
│   │   ├── Scene3D.tsx         # Componente principal 3D
│   │   └── types.ts            # Tipos de escena, presets de cámara
│   ├── telemetry/              # Esquema y validación de telemetría
│   │   ├── types.ts            # Tipos TypeScript (schema V2)
│   │   ├── validator.ts        # Validación estricta de frames
│   │   └── index.ts
│   ├── state/                  # Store global (Zustand)
│   │   └── store.ts            # Estado central + selectores
│   ├── scenarios/              # Simulador MOCK determinista
│   │   └── mockSimulator.ts    # 10 escenarios predefinidos
│   ├── replay/                 # Sistema de replay
│   │   └── replayManager.ts    # Grabación y reproducción
│   ├── bridge/                 # Bridge UDP/WebSocket (futuro MATLAB)
│   │   └── bridge.ts
│   ├── ui/                     # Componentes de UI
│   │   ├── Dashboard.tsx       # Panel principal de datos
│   │   ├── Panels.tsx          # Selectores, controles, status
│   │   ├── Charts.tsx          # Gráficos live (canvas)
│   │   ├── SensorDetailPanel.tsx # Panel detalle al click
│   │   └── Timeline.tsx        # Línea temporal de eventos
│   ├── hooks/                  # Custom hooks
│   ├── utils/                  # Utilidades
│   └── styles/                 # CSS global
├── tests/                      # Tests unitarios
├── docs/                       # Documentación
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Instalación

```powershell
cd web-digital-twin
npm install
```

## Comandos de Desarrollo

```powershell
# Desarrollo local
npm run dev

# Desarrollo accesible en LAN (móvil/otro PC)
npm run dev:lan

# Build de producción
npm run build

# Preview del build
npm run start

# Linting
npm run lint
npm run lint:fix

# Formateo
npm run fmt
npm run fmt:fix

# Type checking
npm run typecheck

# Tests
npm run test
npm run test:ui
npm run test:coverage
```

## Ejecución

### Modo MOCK (por defecto)
```powershell
npm run dev
```
- Simulador TypeScript determinista
- 10 escenarios predefinidos
- Sin dependencias externas
- Funciona offline

### Modo REPLAY
```powershell
# Grabar una sesión
# (botón REC en UI futura)
# Reproducir
# (cargar archivo .json o .jsonl en UI futura)
```

### Modo MATLAB LIVE (futuro)
Requiere bridge Node.js + MATLAB UDP sender:
```powershell
# Puerto UDP MATLAB → Bridge: 45810
# Puerto WebSocket Bridge → Browser: 45811
npm run bridge:matlab  # (por implementar)
```

## Escenarios MOCK Disponibles

| ID | Nombre | Descripción |
|----|--------|-------------|
| `NORMAL` | Operación Normal | Sistema en estado estable |
| `GAS_LEAK_KITCHEN` | Fuga Cocina | GS1 → WARNING → CRITICAL → VK CLOSED → SAFE_LATCHED |
| `GAS_LEAK_TECHNICAL` | Fuga Área Técnica | GS2 → WARNING → CRITICAL → VT CLOSED → SAFE_LATCHED |
| `GAS_LEAK_LIVING` | Fuga Living | GS3 → WARNING → CRITICAL → VL CLOSED → SAFE_LATCHED |
| `PIPE_RUPTURE_LIVING` | Ruptura Living | PL ↓, flow ↑, GS3 ↑ → VL CLOSED → SAFE_LATCHED |
| `FALSE_PRESSURE_SPIKE` | Falso Pico Presión | P1 spike → NORMAL (sin actuación crítica) |
| `PRESSURE_SENSOR_FAILURE` | Fallo Sensor Presión | PL = 0 → FAULT → VL CLOSED |
| `GAS_SENSOR_FAILURE_Z3` | Fallo Sensor Gas Z3 | GS3 invalid → FAULT → VL CLOSED |
| `MULTI_ZONE_LEAK` | Múltiples Zonas | GS1+GS2+GS3 → CRITICAL → VK+VT+VL CLOSED |
| `FULL_DEMO` | Demo Completa | Secuencia 45s: normal → falso pico → fuga cocina → reset → ruptura living |

## Vistas 3D

| Vista | Descripción |
|-------|-------------|
| **CASA** | Vivienda normal con iluminación ligera |
| **XRAY** | Paredes/techo transparentes, interior visible |
| **TUBERÍAS** | Casa atenuada, red de tuberías resaltada (VM, VK, VL, VT, P0, P1, PK, PL, PT) |
| **PRESIÓN** | Presión relativa visual en tuberías, etiquetas mbar |
| **SEGURIDAD** | Sensores GS1/GS2/GS3, válvulas, estado sistema, alarmas, buzzer, LEDs |

## Presets de Cámara

- **EXTERIOR** - Vista general exterior
- **COCINA** - Zona cocina (GS1)
- **LIVING** - Sala de estar (GS3)
- **ÁREA TÉCNICA** - Área técnica (GS2, VT)
- **MANIFOLD/MEDIDOR** - Manifold principal (VM, VK, P0, P1)
- **VISTA SUPERIOR** - Planta superior (ideal con XRAY)
- **XRAY** - Vista XRAY angular

## Interacción

- **Click en objeto** → Panel lateral con detalles
  - **GS1/GS2/GS3**: ADC, nivel, validez, proxy simulado, freshness
  - **P0/P1/PK/PL/PT**: Presión (mbar), status, zona, source
  - **VM/VK/VL/VT**: Estado, upstream/downstream/delta, razón, zona afectada
- **Botones superiores** → Cambio de vista (CASA/XRAY/TUBERÍAS/PRESIÓN/SEGURIDAD)
- **Selector cámara** → Presets con transición animada
- **Panel escenarios** → Control MOCK (deshabilitado en MATLAB_SIM)
- **Controles replay** → Play/Pause/Seek/Speed (0.5x/1x/2x)
- **Timeline inferior** → Eventos marcados, click para saltar

## Dashboard Principal

Muestra permanentemente:
- **SIGAS-RT** + **SOURCE** (MOCK_SIM/MATLAB_SIM/RECORDED_REPLAY)
- **CONNECTION** (LIVE/STALE/DISCONNECTED - thresholds 1.5s/3s)
- **SYSTEM STATE** + **EVENT** + **AFFECTED ZONE**
- **GAS**: Z1/Z2/Z3 con ADC, nivel, validez
- **PRESSURE**: P0/P1/PK/PL/PT con barras visuales
- **FLOW**: Main/Living
- **VALVES**: VM/VK/VL/VT con presiones upstream/downstream/delta
- **BUZZER** + **LED GREEN** + **LED RED**
- **SIM TIME** + métricas de performance (FPS, frame time, mode)

## Esquema de Telemetría V2

```typescript
{
  schemaVersion: 2,
  source: "MOCK_SIM" | "MATLAB_SIM" | "RECORDED_REPLAY",
  sequence: number,
  simTime: number,
  timestamp: number,
  systemState: "STARTUP" | "NORMAL" | "WARNING" | "CRITICAL" | "SAFE_LATCHED" | "FAULT",
  eventType: "NONE" | "GAS_LEAK" | "PRESSURE_ANOMALY" | "PIPE_RUPTURE" | "SUPPLY_PRESSURE_LOSS" | "SENSOR_FAULT" | "MULTI_ZONE",
  affectedZoneMask: number,  // bitmask: 1=Kitchen, 2=Technical, 4=Living
  gas: {
    Z1: { adc: number, level: string, valid: boolean },
    Z2: { adc: number, level: string, valid: boolean },
    Z3: { adc: number, level: string, valid: boolean }
  },
  pressure: { P0: number, P1: number, PK: number, PL: number, PT: number },
  flow: { main: number, living: number },
  valves: { VM: "OPEN"|"CLOSED", VK: "OPEN"|"CLOSED", VL: "OPEN"|"CLOSED", VT: "OPEN"|"CLOSED" },
  buzzer: boolean,
  greenLed: boolean,
  redLed: boolean
}
```

## Optimización del Modelo 3D

Original: `visualization/blender/exports/sigas_house.glb` (1.7 MB, 211 meshes)

Optimizado: `public/models/sigas_house_web.glb` (~1.5 MB, 18 meshes - 1 por material)

Pipeline:
1. **dedup** - Deduplicación de accessors (1.7 MB → 765 KB)
2. **meshopt** - Compresión Meshopt (765 KB → 389 KB)
3. **join** - Fusionar meshes por material (389 KB → 1.5 MB, 211 → 18 draw calls)

Nombres preservados: `SIGAS_MQ2_Z1`, `SIGAS_MQ2_Z2`, `SIGAS_AutoValve`, `SIGAS_MainPipe`, `SIGAS_LedGreen`, `SIGAS_LedRed`, `SIGAS_Buzzer`

## Modos de Rendimiento

| Modo | Pixel Ratio | Sombras | Partículas | Post-FX | Texturas |
|------|-------------|---------|------------|---------|----------|
| **LOW** | 1x | No | Mínimas | No | Reducidas |
| **MEDIUM** | 1.5x | Limitadas | Normales | No | Normales |
| **HIGH** | 2x | Completas | Completas | Opcionales | Completas |
| **AUTO** | Detecta GPU | Conservador | - | - | - |

## Accesibilidad

- Estados comunicados con **icono + texto + color** (no solo color)
- Ejemplo: `🔴 CRITICAL` en vez de solo rojo
- Focus visible en todos los controles
- `prefers-reduced-motion` respetado

## Testing

```powershell
npm run test           # Ejecutar tests
npm run test:ui        # UI visual de Vitest
npm run test:coverage  # Cobertura de código
```

Tests incluidos:
- Validador de telemetría (schema, types, enums, finite numbers)
- Funciones de utilidad (connection status, zone masks, valve pressures)
- Simulador MOCK (todos los escenarios, validación de frames)
- Replay player (play/pause/seek/speed/end callback)

## Build Gates (Pre-commit)

```powershell
npm run lint      # ESLint - debe PASS
npm run typecheck # TypeScript - debe PASS
npm run test      # Vitest - debe PASS
npm run build     # Vite build - debe PASS
```

## Documentación Adicional

- `docs/web/architecture.md` - Arquitectura del sistema
- `docs/web/telemetry_schema.md` - Esquema V2 detallado
- `docs/web/matlab_bridge.md` - Protocolo UDP/WebSocket para MATLAB
- `docs/web/performance.md` - Guía de optimización
- `docs/web/demo.md` - Guía de escenarios y demo

## Launcher (Windows)

```powershell
# Desde raíz del repo SIGAS-RT
.\scripts\run_web_twin.ps1
```
Verifica Node, instala deps si faltan, inicia bridge mock, inicia Vite, abre navegador.

## MATLAB LIVE - Protocolo Pendiente

Para conectar MATLAB en vivo:
1. MATLAB envía frames UDP a `localhost:45810`
2. Bridge Node.js recibe UDP, valida, reenvía por WebSocket `ws://localhost:45811`
3. Browser recibe WebSocket, valida, actualiza store

Frame UDP esperado (JSON):
```json
{
  "schemaVersion": 2,
  "source": "MATLAB_SIM",
  "sequence": 123,
  "simTime": 45.67,
  "timestamp": 1234567890123,
  "systemState": "NORMAL",
  "eventType": "NONE",
  "affectedZoneMask": 0,
  "gas": { "Z1": {"adc":800,"level":"NORMAL","valid":true}, ... },
  "pressure": { "P0":20, "P1":18, "PK":17, "PL":16, "PT":15 },
  "flow": { "main":5, "living":2 },
  "valves": { "VM":"OPEN", "VK":"OPEN", "VL":"OPEN", "VT":"OPEN" },
  "buzzer": false,
  "greenLed": true,
  "redLed": false
}
```

## Licencia

MIT - Ver `LICENSE` en raíz del repo.

---

**SIGAS-RT Web Digital Twin** — MOCK DEMO PASS