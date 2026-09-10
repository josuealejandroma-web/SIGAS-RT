# Arquitectura de visualizacion SIGAS-RT

## Principio de seguridad

La visualizacion no decide estados criticos. La cadena critica permanece:

```text
Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador
```

El gemelo digital refleja estados ya decididos por firmware ESP32/FreeRTOS.

## Flujo operativo

```text
Wokwi / firmware ESP32 / FreeRTOS
    -> telemetria @SIGAS
    -> Python Bridge
    -> UDP local 127.0.0.1:45701
    -> Godot
    -> materiales, camaras, indicadores y animaciones
```

Godot envia solicitudes de escenario por `127.0.0.1:45702`, pero esos comandos son nombres declarados en `visualization/scenarios/scenario_catalog.json`. No son ordenes directas a valvula, buzzer ni LEDs.

El bridge aplica reemplazo de solicitud: una nueva cancela el escenario activo con `terminate`, espera un tiempo acotado y usa `kill` solo como respaldo antes de iniciar el siguiente. Un unico worker conserva como maximo una solicitud pendiente. `shutdown()` detiene el proceso, une el lector de telemetria y cierra ambos sockets tambien ante excepcion o `KeyboardInterrupt`.

## Capas

| Capa | Ruta | Responsabilidad |
| --- | --- | --- |
| Firmware | `src/`, `include/` | Adquisicion, seguridad, actuacion y telemetria opcional. |
| Simulacion | `simulation/` | Escenarios Wokwi y mediciones temporales. |
| Bridge | `visualization/bridge/` | Validar comandos, ejecutar Wokwi y reenviar telemetria. |
| Blender | `visualization/blender/` | Fuente reproducible de casa, tuberias y componentes fisicos. |
| Modelos Godot | `visualization/godot/models/` | GLB importable por Godot. |
| Godot | `visualization/godot/` | HUD, camaras, frescura LIVE, replay grabado, demo sintetica, vista tecnica y estados visuales. |

## Vistas

La camara orbital soporta:

- Exterior general.
- Planta baja.
- Planta alta.
- Cocina / Zona 1.
- Vista tecnica seccionada.
- Medidor y valvulas.
- Gabinete de control / ESP32.
- Vista seccionada amplia.

La vista tecnica oculta paredes y techo importados para exponer tuberias, sensores, medidor, valvulas, ESP32 y flujo fisico.

## Lectura fisica

La casa importada desde Blender incluye referencias visuales para ubicar el sistema en contexto:

- fachada, cubierta, balcon, buhardillas, ventanas y jardineras;
- cocina, sala, comedor, dormitorios, bano y area tecnica con mobiliario de escala;
- medidor exterior, valvula manual, valvula automatica, actuador, tuberias, abrazaderas y flechas de flujo;
- sensores MQ-2 con rejilla, gabinete de control, ESP32, antena, borneras, LEDs y buzzer.

Estos elementos son geometria de soporte para observabilidad. La logica de seguridad permanece en firmware y la visualizacion solo refleja estados recibidos.

Godot representa directamente las salidas recibidas; no vuelve a inferir LEDs o buzzer a partir de `state`. `OPEN` y `CLOSED` describen la orden del prototipo de software, no certifican la posicion fisica final de una valvula real.

## Contrato de telemetria

El bridge acepta dos clases sin mezclarlas:

- `state`: esquema SIGAS completo con estado ya decidido por `TaskSafety` y salidas ordenadas `valve`, `buzzer`, `green_led` y `red_led` reportadas por firmware;
- `timing`: medicion valida con timestamps de confirmacion y recepcion del actuador, sin campos inventados de estado, ADC, nivel o valvula.

Una linea vacia, JSON nulo, objeto vacio, tipo incorrecto o campo esencial ausente se descarta. Solo una medicion valida puede producir `PASS` cuando `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED <= 500000 us`, o `FAIL` cuando supera el deadline. La ausencia de medicion se presenta como `N/A`.

## Estado de conexion y fuente

Godot conserva separadamente la conexion UDP y la fuente mostrada. `LIVE`, `STALE` y `DISCONNECTED` se calculan con reloj monotono y umbrales de 1500/3000 ms. `RECORDED REPLAY` usa un JSONL proveniente de una captura Wokwi identificada; `SYNTHETIC DEMO` usa datos manuales y nunca se rotula como replay grabado.

Ninguno de estos cinco indicadores decide si existe fuga, modifica `SystemState`, abre o cierra actuadores ni sustituye `TaskSafety` o `TaskActuator`.

## Estados visuales

| Estado | Representacion |
| --- | --- |
| `SYSTEM_STARTUP` | Valvula cerrada, indicador seguro/arranque. |
| `SYSTEM_NORMAL` | LED verde activo, valvula abierta, fugas ocultas. |
| `SYSTEM_WARNING` | Zona afectada en amarillo, fuga conceptual visible si el nivel no es normal. |
| `SYSTEM_CRITICAL` | Zona afectada en rojo, buzzer activo, valvula cerrandose/cerrada. |
| `SYSTEM_SAFE_LATCHED` | Valvula cerrada, LED rojo y fuga conceptual en zona afectada. |
| `SYSTEM_FAULT` | Cierre seguro y coloracion de falla. |

## Validacion sin Wokwi

Sin ejecutar Wokwi, Godot se valida con `VisualSelfTest.gd`, `FreeWalkSelfTest.gd` y `TelemetrySelfTest.gd`. El replay grabado y la demo sintetica no reemplazan evidencia Wokwi nueva; permiten comprobar importacion, navegacion, contrato, expiracion y respuesta visual local.
