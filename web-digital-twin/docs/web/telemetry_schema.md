# Esquema de Telemetría V2 - SIGAS-RT

## Resumen

Este documento define el esquema de telemetría versión 2 usado por el SIGAS-RT Web Digital Twin para comunicación entre fuentes (MOCK_SIM, MATLAB_SIM, RECORDED_REPLAY) y la aplicación web.

## Estructura del Frame

```json
{
  "schemaVersion": 2,
  "source": "MOCK_SIM",
  "sequence": 12345,
  "simTime": 45.67,
  "timestamp": 1700000000123,
  "systemState": "NORMAL",
  "eventType": "NONE",
  "affectedZoneMask": 0,
  "gas": {
    "Z1": { "adc": 800, "level": "NORMAL", "valid": true },
    "Z2": { "adc": 750, "level": "NORMAL", "valid": true },
    "Z3": { "adc": 700, "level": "NORMAL", "valid": true }
  },
  "pressure": {
    "P0": 20.0,
    "P1": 18.0,
    "PK": 17.0,
    "PL": 16.0,
    "PT": 15.0
  },
  "flow": {
    "main": 5.0,
    "living": 2.0
  },
  "valves": {
    "VM": "OPEN",
    "VK": "OPEN",
    "VL": "OPEN",
    "VT": "OPEN"
  },
  "buzzer": false,
  "greenLed": true,
  "redLed": false
}
```

## Definición de Campos

### Metadatos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `schemaVersion` | `integer` | Versión del esquema. **Debe ser 2**. |
| `source` | `string` | Origen de los datos. Ver [Fuentes](#fuentes). |
| `sequence` | `integer` | Contador monótono incremental por frame. |
| `simTime` | `number` | Tiempo de simulación en segundos (float). |
| `timestamp` | `integer` | Unix timestamp ms (Date.now()) de generación. |

### Estado del Sistema

| Campo | Tipo | Valores Válidos |
|-------|------|-----------------|
| `systemState` | `string` | `STARTUP`, `NORMAL`, `WARNING`, `CRITICAL`, `SAFE_LATCHED`, `FAULT` |
| `eventType` | `string` | `NONE`, `GAS_LEAK`, `PRESSURE_ANOMALY`, `PIPE_RUPTURE`, `SUPPLY_PRESSURE_LOSS`, `SENSOR_FAULT`, `MULTI_ZONE` |
| `affectedZoneMask` | `integer` | Bitmask de zonas afectadas. Ver [Zonas](#zonas-afectadas). |

### Sensores de Gas

```json
"gas": {
  "Z1": { "adc": 800, "level": "NORMAL", "valid": true },
  "Z2": { "adc": 750, "level": "NORMAL", "valid": true },
  "Z3": { "adc": 700, "level": "NORMAL", "valid": true }
}
```

| Zona | Descripción | ADC Típico | Niveles |
|------|-------------|------------|---------|
| `Z1` | Cocina (GS1) | 500-1500 | NORMAL, WARNING, CRITICAL, FAULT |
| `Z2` | Área Técnica (GS2) | 500-1500 | NORMAL, WARNING, CRITICAL, FAULT |
| `Z3` | Living (GS3) | 500-1500 | NORMAL, WARNING, CRITICAL, FAULT |

**Campos por zona:**
- `adc`: `number` (0-4095, 12-bit ADC). Valor bruto del conversor.
- `level`: `string` - `NORMAL` (<1500), `WARNING` (1500-2500), `CRITICAL` (>2500), `FAULT` (inválido).
- `valid`: `boolean` - `true` si lectura confiable, `false` si sensor falla.

### Sensores de Presión

```json
"pressure": {
  "P0": 20.0,
  "P1": 18.0,
  "PK": 17.0,
  "PL": 16.0,
  "PT": 15.0
}
```

| Sensor | Ubicación | Rango Típico (mbar) |
|--------|-----------|---------------------|
| `P0` | Suministro / Entrada | 18-22 |
| `P1` | Manifold Principal | 16-20 |
| `PK` | Ramal Cocina | 15-19 |
| `PL` | Ramal Living | 14-18 |
| `PT` | Área Técnica | 13-17 |

Unidad: **mbar** (milibares). Valores `number` finitos.

### Caudales

```json
"flow": {
  "main": 5.0,
  "living": 2.0
}
```

| Campo | Descripción | Unidad |
|-------|-------------|--------|
| `main` | Caudal línea principal | L/min |
| `living` | Caudal ramal Living | L/min |

### Válvulas

```json
"valves": {
  "VM": "OPEN",
  "VK": "OPEN",
  "VL": "OPEN",
  "VT": "OPEN"
}
```

| Válvula | Ubicación | Función |
|---------|-----------|---------|
| `VM` | Principal / Suministro | Corte total entrada |
| `VK` | Ramal Cocina | Aislamiento zona cocina |
| `VL` | Ramal Living | Aislamiento zona living |
| `VT` | Área Técnica | Aislamiento zona técnica |

Estados: `"OPEN"` | `"CLOSED"`.

**Cálculo de ΔP (delta presión):**
- `VM`: P0 - P1
- `VK`: P1 - PK
- `VL`: P1 - PL
- `VT`: PT - PT (misma presión, válvula de seguridad)

### Indicadores

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `buzzer` | `boolean` | `true` = sonando |
| `greenLed` | `boolean` | `true` = encendido (normal) |
| `redLed` | `boolean` | `true` = encendido (alarma) |

## Fuentes

| Valor | Descripción |
|-------|-------------|
| `MOCK_SIM` | Simulador TypeScript determinista (offline) |
| `MATLAB_SIM` | MATLAB/Simulink en vivo (vía bridge UDP) |
| `RECORDED_REPLAY` | Reproducción de sesión grabada |

## Zonas Afectadas (Bitmask)

| Bit | Valor | Zona | Constante |
|-----|-------|------|-----------|
| 0 | 1 | Cocina | `ZONE_KITCHEN` |
| 1 | 2 | Área Técnica | `ZONE_TECHNICAL` |
| 2 | 4 | Living | `ZONE_LIVING` |

Ejemplos:
- `0` = Ninguna
- `1` = Solo Cocina
- `3` = Cocina + Técnica
- `7` = Todas (Multi-zona)

## Validación

### Reglas Obligatorias

1. `schemaVersion === 2`
2. `source` ∈ `{MOCK_SIM, MATLAB_SIM, RECORDED_REPLAY}`
3. `sequence`, `simTime`, `timestamp` son `number` finitos
4. `systemState` ∈ enum válido (6 valores)
5. `eventType` ∈ enum válido (7 valores)
6. `affectedZoneMask` es `number` finito
7. `gas.Z1/Z2/Z3` cada uno: `{adc: finite, level: enum, valid: boolean}`
8. `pressure.P0/P1/PK/PL/PT` son `number` finitos
9. `flow.main/living` son `number` finitos
10. `valves.VM/VK/VL/VT` ∈ `{"OPEN", "CLOSED"}`
11. `buzzer`, `greenLed`, `redLed` son `boolean`

### Comportamiento ante Fallo

- Frame inválido → **rechazado silenciosamente**
- No actualiza store
- No rompe conexión
- Log en consola (dev mode)

## Connection Status

Derivado del `timestamp` del último frame válido:

| Estado | Condición | Significado |
|--------|-----------|-------------|
| `LIVE` | `now - lastValid < 1500ms` | Datos frescos |
| `STALE` | `1500ms ≤ delta < 3000ms` | Datos recientes pero viejos |
| `DISCONNECTED` | `delta ≥ 3000ms` | Sin datos recientes |

**En STALE/DISCONNECTED:**
- Se muestra último dato conocido
- **NO** se infiere `NORMAL`, `SAFE`, `OPEN`
- UI muestra indicador visual de degradación

## Formatos de Archivo

### Replay JSON (Array)

```json
{
  "version": 1,
  "source": "WEB_DIGITAL_TWIN",
  "recordedAt": 1700000000123,
  "duration": 45.5,
  "frames": [
    { "timestamp": 1000, "simTime": 0.0, "frame": { ... } },
    { "timestamp": 1033, "simTime": 0.5, "frame": { ... } }
  ]
}
```

### Replay JSON Lines

```jsonl
{"timestamp":1000,"simTime":0.0,"frame":{"schemaVersion":2,"source":"MOCK_SIM",...}}
{"timestamp":1033,"simTime":0.5,"frame":{"schemaVersion":2,"source":"MOCK_SIM",...}}
```

## Ejemplos de Frames por Estado

### STARTUP
```json
{"systemState":"STARTUP","eventType":"NONE","gas":{"Z1":{"adc":0,"level":"NORMAL","valid":false},...}}
```

### NORMAL
```json
{"systemState":"NORMAL","eventType":"NONE","gas":{"Z1":{"adc":800,"level":"NORMAL","valid":true},...}}
```

### WARNING (Fuga Cocina)
```json
{"systemState":"WARNING","eventType":"GAS_LEAK","affectedZoneMask":1,"gas":{"Z1":{"adc":2800,"level":"WARNING","valid":true},...}}
```

### CRITICAL (Fuga Cocina)
```json
{"systemState":"CRITICAL","eventType":"GAS_LEAK","affectedZoneMask":1,"gas":{"Z1":{"adc":3800,"level":"CRITICAL","valid":true},...},"valves":{"VK":"CLOSED"}}
```

### SAFE_LATCHED
```json
{"systemState":"SAFE_LATCHED","eventType":"GAS_LEAK","affectedZoneMask":1,"valves":{"VK":"CLOSED"},"buzzer":true,"redLed":true}
```

### PIPE_RUPTURE_LIVING
```json
{"systemState":"CRITICAL","eventType":"PIPE_RUPTURE","affectedZoneMask":4,"pressure":{"PL":3.0},"flow":{"living":15.0},"valves":{"VL":"CLOSED"}}
```

### FAULT (Sensor Presión)
```json
{"systemState":"FAULT","eventType":"SENSOR_FAULT","pressure":{"PL":0},"valves":{"VL":"CLOSED"},"buzzer":true,"redLed":true}
```

## Compatibilidad MATLAB

El emisor MATLAB debe:
1. Generar frames a **30 Hz** (cada 33.33ms)
2. Incrementar `sequence` monótonamente
3. Usar `simTime` consistente con paso de simulación
4. `timestamp` = `Date.now()` equivalente en MATLAB
5. Enviar por UDP a `localhost:45810` como JSON string
6. Incluir todos los campos (sin omitir opcionales)

## Versionado

- **v1**: Esquema legacy (no documentado aquí)
- **v2**: Actual - agrega `schemaVersion`, `source`, `sequence`, `timestamp`, `valid` en gas, `flow`, válvulas separadas

**Breaking changes v1→v2**: Estructura `gas` anidada, `pressure` objeto, `flow` objeto, `valves` objeto, campos de metadatos.