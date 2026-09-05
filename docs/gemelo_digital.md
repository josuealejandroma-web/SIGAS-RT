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
| Blender | `visualization/blender/` | Fuente reproducible de casa, tuberias, sensores, valvulas y componentes fisicos. |
| GLB | `visualization/godot/models/sigas_house.glb` | Modelo maestro importado por Godot. |
| Godot 4 | `visualization/godot/` | Render 3D, HUD, camara orbital, vista tecnica y botones de escenarios. |
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
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/VisualSelfTest.gd
```

Regeneracion Blender:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python visualization\blender\scripts\create_scene.py
tools\godot\godot.cmd --headless --path visualization\godot --import
```

## Resultados de validacion

| Elemento | Resultado |
| --- | --- |
| Godot instalado | `4.7.2.stable.official.ed1daf0bf` en `tools/godot/` |
| Headless | PASS con `tools\godot\godot.cmd --headless --path visualization\godot --quit` |
| Autoinspeccion visual | PASS con `GODOT_VISUAL_SELF_TEST: PASS` |
| Apertura grafica | PASS; Godot inicio con Vulkan Forward+ sobre Intel HD Graphics 620 |
| Blender | PASS con Blender 5.1.0, `bpy` y exportacion GLB |
| Casa importada | PASS; `sigas_house.glb` contiene casa de dos pisos, tuberias, sensores, medidor, valvulas, ESP32, LEDs, buzzer y markers |
| Bridge UDP | PASS; `RUN_NORMAL` recibio `SYSTEM_STARTUP` y `SYSTEM_NORMAL` desde Wokwi |
| Wokwi visual-safe | PASS; telemetria `@SIGAS` con valvula cerrada en startup y abierta en normal |
| FULL DEMO | Cubierto por comando `FULL_DEMO` asociado a `critical_logic_test.yaml` |
| Desconexion Godot | PASS por prueba de bridge/Wokwi sin requerir receptor Godot para continuar firmware |
| Desconexion bridge | PASS por regresion Wokwi directa; la funcion critica no depende del bridge |

## Limitaciones encontradas

- Wokwi CLI mezcla anotaciones del escenario con stdout y puede fragmentar lineas JSON cuando se parsea stdout directamente. Se corrigio el bridge para leer telemetria desde `--serial-log-file` y acumular fragmentos hasta salto de linea.
- La validacion visual interactiva desde Codex no permite inspeccionar pixeles de una ventana nativa. Se complemento con apertura grafica real y autoinspeccion Godot de nodos, materiales y estados.
- Godot portable se mantiene en `tools/godot/`, ignorado por Git. No se versionan binarios.
- La casa final se genera en Blender y se importa como GLB; las esferas de gas se instancian en Godot sobre markers Blender porque son una visualizacion conceptual animada, no geometria estructural de la vivienda.
