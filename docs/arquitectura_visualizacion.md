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

## Capas

| Capa | Ruta | Responsabilidad |
| --- | --- | --- |
| Firmware | `src/`, `include/` | Adquisicion, seguridad, actuacion y telemetria opcional. |
| Simulacion | `simulation/` | Escenarios Wokwi y mediciones temporales. |
| Bridge | `visualization/bridge/` | Validar comandos, ejecutar Wokwi y reenviar telemetria. |
| Blender | `visualization/blender/` | Fuente reproducible de casa, tuberias y componentes fisicos. |
| Modelos Godot | `visualization/godot/models/` | GLB importable por Godot. |
| Godot | `visualization/godot/` | HUD, camaras, replay local, vista tecnica y estados visuales. |

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

Cuando Wokwi no esta disponible por cuota, Godot se valida con replay local y `VisualSelfTest.gd`. Esto no reemplaza la evidencia Wokwi, pero permite comprobar importacion del GLB, nodos obligatorios, vista tecnica, camaras y respuesta visual a estados.
