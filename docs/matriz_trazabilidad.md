# Matriz de trazabilidad SIGAS-RT

## Tiempo real

| Requisito | Prueba | Evidencia | Resultado |
| --- | --- | --- | --- |
| RT-01 | TT-01 a TT-06 | `TaskSensors` periodica con `vTaskDelayUntil()` y `SENSOR_PERIOD=100 ms`. | PASS |
| RT-02 | Revision de codigo | `src/sensors.cpp` y `src/diagnostics.cpp` usan `vTaskDelayUntil()`. | PASS |
| RT-03 | TT-01 a TT-06 | `post_confirmation_response_us <= 500000`; WORT observado 23123 us. | PASS |
| RT-04 | Revision de codigo | `TaskSafety` prioridad 4, superior a `TaskDiagnostics` prioridad 1. | PASS |
| RT-05 | Revision de codigo | `TaskActuator` prioridad 5, maxima del sistema. | PASS |
| RT-06 | TT-04 | Carga controlada en `TaskDiagnostics`; peor respuesta 23123 us. | PASS |
| RT-07 | TT-01 a TT-06 | CSV separa confirmation, command, dispatch, post-confirmation y end-to-end. | PASS |

## Seguridad funcional simulada

| Requisito | Prueba | Evidencia | Resultado |
| --- | --- | --- | --- |
| RF-06 | CL-04, CL-05, TT-01 a TT-03 | Confirmacion por 3 muestras consecutivas. | PASS |
| RF-08 / RS-04 | CL-05, TT-01 a TT-03 | `SAFE_CLOSE` al confirmar condicion critica. | PASS |
| RF-11 / RS-03 | CL-06 | `SYSTEM_SAFE_LATCHED` mantiene cierre. | PASS |
| RF-13 | CL-07, CL-08 | Reset rechazado inseguro y aceptado seguro. | PASS |
| RS-09 | CL-10 | Timeout de sensor lleva a `SYSTEM_FAULT` y `SAFE_CLOSE`. | PASS |

## Escenarios temporales

| Caso | Archivo | Proposito | Resultado |
| --- | --- | --- | --- |
| TT-01 | `simulation/timing_test.yaml` | Zona 1 critica sostenida. | PASS |
| TT-02 | `simulation/timing_zone2_test.yaml` | Zona 2 critica sostenida. | PASS |
| TT-03 | `simulation/timing_both_test.yaml` | Ambas zonas criticas. | PASS |
| TT-04 | `simulation/timing_load_test.yaml` | Diagnostico bajo carga. | PASS |
| TT-05 | `simulation/timing_phase_test.yaml` | Evento desplazado respecto al periodo de muestreo. | PASS |
| TT-06 | `simulation/run_timing_measurements.ps1` | Repeticion automatizada. | PASS |
