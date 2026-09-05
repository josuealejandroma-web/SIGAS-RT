# Gemelo digital local SIGAS-RT

## Objetivo

El gemelo digital muestra una casa 3D con sensores, ESP32, tuberias, valvula, LEDs, buzzer y nube de gas. Es una herramienta local de observabilidad y demostracion; no implementa la funcion critica de seguridad.

La arquitectura critica sigue siendo:

```text
Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador
```

## Componentes

| Componente | Ruta | Responsabilidad |
| --- | --- | --- |
| Godot 4 | `visualization/godot/` | Render 3D, HUD, camara orbital y botones de escenarios. |
| Bridge Python | `visualization/bridge/` | Ejecutar escenarios Wokwi permitidos y reenviar telemetria por UDP local. |
| Catalogo | `visualization/scenarios/` | Lista de comandos y metadatos visuales. |
| Firmware | `src/diagnostics.cpp` | Emision opcional `@SIGAS` bajo `SIGAS_RT_VISUALIZATION`. |

## Protocolo

El firmware de visualizacion emite lineas:

```text
@SIGAS {"type":"state",...}
```

El bridge valida los campos y reenvia JSON compacto a Godot por `127.0.0.1:45701/UDP`. Godot envia solicitudes de escenario al bridge por `127.0.0.1:45702/UDP`.

## Seguridad

- El token de Wokwi se lee desde `WOKWI_CLI_TOKEN`.
- No se almacena ni imprime el token.
- Godot no envia comandos directos a valvula, buzzer o LEDs.
- El bridge solo acepta comandos declarados en `scenario_catalog.json`.
- La visualizacion no reemplaza la evidencia temporal de `docs/analisis_temporal.md`.

## Validacion local

Pruebas Python:

```powershell
python -m unittest discover visualization\bridge\tests
```

Build de firmware con telemetria:

```powershell
.\.venv\Scripts\platformio run -e esp32doit-devkit-v1-visualization
```

Validacion visual en Godot:

```powershell
godot --path visualization\godot
```

En esta estacion, `godot` debe estar disponible en `PATH` para ejecutar validacion headless o abrir la escena desde scripts.
