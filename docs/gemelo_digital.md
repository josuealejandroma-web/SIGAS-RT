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
| Godot 4 | `visualization/godot/` | Render 3D, exploracion libre, tour orbital, HUD, vista tecnica, frescura de datos y fuentes de demostracion. |
| Bridge Python | `visualization/bridge/` | Ejecutar escenarios Wokwi permitidos y reenviar telemetria por UDP local. |
| Replay grabado | `visualization/godot/data/wokwi_recorded_replay.jsonl` | Captura Wokwi real normalizada, ordenada e identificada por fuente y SHA-256. |
| Catalogo | `visualization/scenarios/` | Lista de comandos y metadatos visuales. |
| Firmware | `src/diagnostics.cpp` | Emision opcional `@SIGAS` bajo `SIGAS_RT_VISUALIZATION`. |

## Modelo visual

El modelo Blender representa una vivienda seccionada de dos pisos con fachada, cubierta, mobiliario interior, cocina, area tecnica y gabinete de control. El sistema SIGAS-RT se mantiene visible como instalacion fisica: entrada de gas, medidor, valvula manual, valvula automatica, tuberias, soportes, sensores MQ-2, ESP32, LEDs, buzzer y puntos de fuga conceptuales.

El pulido visual solo mejora legibilidad espacial, materiales, iluminacion y camaras. No modifica umbrales, tiempos, escenarios Wokwi ni comportamiento critico del firmware.

## Modos de presentacion

- **Tour automatico Blender:** recorrido maestro de 15 ambientes, 529 frames y aproximadamente 22 segundos en `visualization/blender/source/sigas_house.blend`.
- **Tour Godot:** recorrido orbital compacto por puntos de interes. Complementa la presentacion, pero no reemplaza el tour interior de Blender.
- **Exploracion libre Godot:** `CharacterBody3D`, camara a 1.70 m, movimiento WASD, mouse, velocidades normal/rapida/precisa, colisiones y accesos seguros entre zonas.
- **Vista tecnica:** oculta cubierta, muros y planta superior seccionable para dejar visibles tuberias, sensores, medidor, valvulas y gabinete SIGAS-RT.

Los controles, posiciones y recomendaciones de exposicion estan documentados en `docs/modo_presentacion.md`.

## Protocolo

El firmware de visualizacion emite lineas:

```text
@SIGAS {"type":"state",...}
```

El bridge separa eventos de estado y eventos temporales. Un estado exige el esquema `type`, `seq`, `state`, `action`, `reason`, ADC y nivel de ambas zonas, `reset`, `valve`, `buzzer`, `green_led`, `red_led`, `sample_us`, `decision_us` y `deadline_us`, todos con tipos y rangos validos. Estas salidas proceden de la misma decision que construye `ActuatorCommand`; Godot las representa sin recalcularlas desde el estado. Un evento `[TIMING]` exige `SEQ`, `T_CRITICAL_CONFIRMED`, `T_ACTUATOR_RECEIVED` y `DEADLINE_US`; `response_us` y `PASS`/`FAIL` se derivan de esos timestamps y nunca de valores por defecto.

El bridge ejecuta un unico worker. Una solicitud nueva reemplaza la pendiente y cancela limpiamente el proceso activo antes de iniciar otro (`terminate`, espera acotada y `kill` de respaldo). El cierre centralizado une el lector de telemetria y cierra listener y socket de salida incluso ante excepciones o interrupcion.

El JSON validado se reenvia a Godot por `127.0.0.1:45701/UDP`. Godot vuelve a validar el contrato antes de renovar la frescura o representar datos. Las solicitudes de escenario salen por `127.0.0.1:45702/UDP`.

## Fuentes y frescura

| Indicador | Significado |
| --- | --- |
| `LIVE` | Llego telemetria SIGAS valida hace menos de 1500 ms. |
| `STALE` | La ultima telemetria valida tiene entre 1500 y 2999 ms. |
| `DISCONNECTED` | No existe telemetria valida o han transcurrido al menos 3000 ms. |
| `RECORDED REPLAY` | Reproduccion de la captura real identificada en el JSONL. |
| `SYNTHETIC DEMO` | Secuencia manual para demostrar exclusivamente la interfaz. |

Los umbrales consideran la emision nominal aproximada cada 500 ms: `STALE` equivale a tres periodos sin datos y `DISCONNECTED` a seis. Se usa `Time.get_ticks_msec()`, monotono local. Un cambio de conexion no altera el ultimo `SystemState`, no lo convierte en `SYSTEM_FAULT` o `SYSTEM_NORMAL` y no afirma un estado seguro.

## Seguridad

- El token de Wokwi se lee desde `WOKWI_CLI_TOKEN`.
- No se almacena ni imprime el token.
- Godot no envia comandos directos a valvula, buzzer o LEDs.
- El bridge solo acepta comandos declarados en `scenario_catalog.json`.
- `valve`, `buzzer` y LEDs representan salidas ordenadas por software; no certifican movimiento fisico completado.
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
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/FreeWalkSelfTest.gd
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/TelemetrySelfTest.gd
```

Regeneracion Blender:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python visualization\blender\scripts\create_scene.py
tools\godot\godot.cmd --headless --path visualization\godot --import
```

## Resultados de validacion

| Elemento | Resultado |
| --- | --- |
| Godot instalado | `PASS LOCAL`; version `4.7.2.stable.official.ed1daf0bf` |
| Headless | `PASS LOCAL` con `godot --headless --path visualization\godot --quit` |
| Autoinspeccion visual | `PASS LOCAL` con `GODOT_VISUAL_SELF_TEST: PASS` |
| Navegacion interactiva | `PASS LOCAL` con `FREE-01` a `FREE-17` y `M07-QUICK-*` |
| Telemetria y fuentes | `PASS LOCAL` con A01, A02 y A03 |
| Captura grafica Godot | `PASS LOCAL` historico a 1280x720 en las vistas documentadas |
| Apertura grafica | `PASS LOCAL` historico con Vulkan Forward+ |
| Blender | `PASS LOCAL` con Blender 5.1.0, `bpy` y validacion del recorrido |
| Casa importada | `PASS LOCAL`; `sigas_house.glb` contiene casa, sistema de gas y markers |
| Bridge UDP con Wokwi | `PASS HISTORICO WOKWI`; no ejecutado en este bloque |
| Wokwi visual-safe | `PASS HISTORICO WOKWI`; no ejecutado en este bloque |
| FULL DEMO | Cubierto por comando `FULL_DEMO` asociado a `critical_logic_test.yaml` |
| Desconexion Godot | `PASS LOCAL` con fakes y `PASS HISTORICO WOKWI` |
| Desconexion bridge | `PASS LOCAL` con fakes y `PASS HISTORICO WOKWI`; la funcion critica no depende del bridge |

## Limitaciones encontradas

- Wokwi CLI mezcla anotaciones del escenario con stdout y puede fragmentar lineas JSON cuando se parsea stdout directamente. Se corrigio el bridge para leer telemetria desde `--serial-log-file` y acumular fragmentos hasta salto de linea.
- Los logs seriales completos siguen siendo artefactos locales ignorados por Git. El JSONL versionado contiene solo 12 estados y un evento temporal extraidos, en orden, de `simulation/wokwi-serial-visualization.log`; la metadata conserva el SHA-256 de la captura fuente. Los cuatro campos de salida del replay estan normalizados al contrato de salidas ordenadas vigente, sin alterar la captura fuente ni sus resultados temporales. Es material historico de visualizacion, no evidencia temporal vigente ni sustituto de una nueva regresion Wokwi.
- Godot portable se mantiene en `tools/godot/`, ignorado por Git. No se versionan binarios.
- La casa final se genera en Blender y se importa como GLB; las esferas de gas se instancian en Godot sobre markers Blender porque son una visualizacion conceptual animada, no geometria estructural de la vivienda.
- El GLB conserva muros continuos y una escalera visual que termina bajo la losa. Godot usa portales de proximidad en puntos seguros para completar puertas y cambio de piso sin atravesar visualmente geometria ni modificar Blender.
