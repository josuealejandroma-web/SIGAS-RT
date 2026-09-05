# Gemelo digital SIGAS-RT

Este directorio contiene una visualizacion local auxiliar para SIGAS-RT.

La funcion critica permanece en el firmware ESP32/FreeRTOS:

```text
Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador
```

La visualizacion no decide estados de seguridad, no envia comandos directos de actuador y no depende de Internet, bases de datos ni servicios cloud.

## Estructura

| Ruta | Proposito |
| --- | --- |
| `blender/` | Fuente reproducible Blender de casa, sistema de gas, sensores y componentes SIGAS-RT. |
| `godot/` | Proyecto Godot 4 del gemelo digital 3D. |
| `bridge/` | Bridge local Python entre Wokwi CLI y Godot. |
| `scenarios/` | Catalogo de escenarios visuales permitidos. |

## Puertos locales

| Puerto | Uso |
| ---: | --- |
| 45701/UDP | Telemetria del bridge hacia Godot. |
| 45702/UDP | Comandos permitidos de Godot hacia el bridge. |

Los comandos aceptados son nombres de escenarios definidos, no ordenes directas sobre valvula, buzzer o LEDs.
