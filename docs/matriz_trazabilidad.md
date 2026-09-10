# Matriz de trazabilidad SIGAS-RT

## Tiempo real

| Requisito | Prueba | Evidencia | Resultado |
| --- | --- | --- | --- |
| RT-01 | TT-01 a TT-06 | `TaskSensors` periodica con `vTaskDelayUntil()` y `SENSOR_PERIOD=100 ms`. | PASS |
| RT-02 | Revision de codigo | `src/sensors.cpp` y `src/diagnostics.cpp` usan `vTaskDelayUntil()`. | PASS |
| RT-03 | TT-01 a TT-06 | `post_confirmation_received_us <= 500000`; WORT observado 22504 us. | PASS |
| RT-04 | Revision de codigo | `TaskSafety` prioridad 4, superior a `TaskDiagnostics` prioridad 1. | PASS |
| RT-05 | Revision de codigo | `TaskActuator` prioridad 5, maxima del sistema. | PASS |
| RT-06 | TT-04 | Carga controlada en `TaskDiagnostics`; peor respuesta `post_confirmation_received_us` 22502 us. | PASS |
| RT-07 | TT-01 a TT-06 | CSV separa confirmation, command, dispatch, post-confirmation y end-to-end. | PASS |

Los resultados TT y RT-03 anteriores son evidencia historica. El arbol actual
posterior a A04/A05/M05 y M01-M03 necesita una nueva regresion Wokwi antes de considerar
vigentes sus resultados temporales finales.

## Regresiones locales de artefactos y medicion

| Caso | Hallazgo | Evidencia | Resultado |
| --- | --- | --- | --- |
| A04-01 | A04 | Resolucion exige BIN, BIN combinado y ELF bajo `.pio/build/<environment>/`. | PASS local |
| A04-02 | A04 | Alternancia normal -> visualizacion -> normal valida manifest, rutas y contenido preparado. | PASS local |
| A05-01 | A05 | Un pico descartado reinicia solo el candidato de su zona y no define `T_FIRST_HIGH`. | PASS local |
| A05-02 | A05 | Confirmacion doble selecciona explicitamente el candidato confirmado mas antiguo. | PASS local |
| A05-03 | A05 | Decision y comando reciben el mismo `T_COMMAND_SENT` inmediatamente antes de publicar. | PASS local |
| M05-01 | M05 | El summary se verifica y regenera deterministicamente desde `wcet_observed.csv`. | PASS local |

## Regresiones de telemetria y demostracion

| Caso | Hallazgo | Evidencia | Resultado |
| --- | --- | --- | --- |
| A01-01 a A01-02 | A01 | Solo el esquema SIGAS valido renueva `LIVE`; `{}` y payloads arbitrarios se rechazan. | PASS local |
| A01-03 a A01-04 | A01 | Reloj monotono cambia a `STALE` en 1500 ms y `DISCONNECTED` en 3000 ms. | PASS local |
| A01-05 a A01-06 | A01 | Un nuevo payload valido recupera `LIVE` desde ambos estados sin alterar `SystemState`. | PASS local |
| A02-01 a A02-03 | A02 | `PASS/FAIL` se deriva de timestamps validos; `[TIMING]` vacio es invalido y queda `N/A`. | PASS local |
| A02-04 a A02-07 | A02 | JSON nulo, vacio, truncado o con tipos incorrectos se descarta y el bridge continua. | PASS local |
| A03-01 | A03 | La secuencia manual se identifica como `SYNTHETIC DEMO`. | PASS local |
| A03-02 | A03 | El loader rechaza replay inexistente o JSONL malformado. | PASS local |
| A03-03 | A03 | `RECORDED REPLAY` conserva orden y valida 13 eventos de una captura Wokwi identificada. | PASS local |

## Regresiones M01-M04

| Caso | Hallazgo | Evidencia | Resultado |
| --- | --- | --- | --- |
| M01-01 a M01-05 | M01 | Histeresis conserva condicion elevada despues de `HIGH`, sale bajo 1000 y mantiene zonas independientes. | PASS local |
| M02-01 a M02-03, M02-07 | M02 | Solo `sequence` consecutivo confirma; los saltos reinician candidatos y el rollover `uint32_t` es continuo. | PASS local |
| M02-04 a M02-06 | M02 | Edad menor al timeout se acepta; edad igual o mayor produce `FAULT`, `SAFE_CLOSE` y no alimenta rearme. | PASS local |
| M03-01 a M03-04 | M03 | Politica unica genera salidas coherentes para `NORMAL`, `WARNING`, `SAFE_LATCHED` y `FAULT`. | PASS local |
| M03-05 a M03-06 | M03 | Godot representa los campos recibidos; replay grabado y demo sintetica cumplen el mismo contrato. | PASS local |
| M04-01 a M04-08 | M04 | Worker unico, reemplazo de solicitud, terminacion con fallback, joins y cierre de sockets verificados con fakes. | PASS local |

Esta fase no ejecuto Wokwi CI ni reemplazo resultados temporales historicos. Las
pruebas anteriores son locales y no modifican la logica critica del firmware.

## Seguridad funcional simulada

| Requisito | Prueba | Evidencia | Resultado |
| --- | --- | --- | --- |
| RF-06 | CL-04, CL-05, TT-01 a TT-03 | Confirmacion por 3 muestras consecutivas. | PASS |
| RF-08 / RS-04 | CL-05, TT-01 a TT-03 | `SAFE_CLOSE` al confirmar condicion critica. | PASS |
| RF-11 / RS-03 | CL-06 | `SYSTEM_SAFE_LATCHED` mantiene cierre. | PASS |
| RF-13 | CL-07, CL-08 | Reset rechazado inseguro y aceptado seguro. | PASS |
| RS-09 | CL-10 | Timeout de sensor lleva a `SYSTEM_FAULT` y `SAFE_CLOSE`. | PASS |
| RS-10 | IT-01, CL-11 | Arranque en `SYSTEM_STARTUP` con valvula cerrada hasta confirmar muestras seguras. | PASS |
| RS-11 | CL-11 | Ausencia de primera muestra lleva a `SYSTEM_FAULT` y `SAFE_CLOSE`. | PASS |

## Regresiones fail-safe locales

| Caso | Requisito | Evidencia | Resultado |
| --- | --- | --- | --- |
| SAFE-BOOT-01 | C02 / GPIO23 exclusivo de rearme | Test host compila modo normal y variante explicita `SIGAS_RT_HARDWARE_SMOKE_TEST`; `src/main.cpp` no consulta el boton para seleccionar modo. | PASS local |
| SAFE-FAULT-01 | RS-09 | `NORMAL -> timeout -> FAULT`; las muestras validas recuperadas no eliminan `SAFE_CLOSE`. | PASS local |
| SAFE-FAULT-02 | RS-03 / RS-09 | `SAFE_LATCHED -> timeout -> FAULT` conserva el requisito de rearme. | PASS local |
| SAFE-FAULT-03 | RS-09 | Muestras seguras consecutivas sin boton mantienen `SYSTEM_FAULT`. | PASS local |
| SAFE-FAULT-04 | RF-13 / RS-03 | Tras muestras seguras, liberacion y pulsacion estable, `FAULT -> NORMAL`. | PASS local |
| SAFE-BOOT-02 | RS-02 / RS-10 | Un fallo parcial enclava `BootGuard`, rechaza la activacion y exige `SAFE_CLOSE`. | PASS local |

Los casos se ejecutan con `scripts/verify_fail_safe.ps1` sin Wokwi. El build
ESP32 sigue verificando la integracion de los helpers con el firmware real.

## Escenarios temporales

| Caso | Archivo | Proposito | Resultado |
| --- | --- | --- | --- |
| TT-01 | `simulation/timing_test.yaml` | Zona 1 critica sostenida. | PASS |
| TT-02 | `simulation/timing_zone2_test.yaml` | Zona 2 critica sostenida. | PASS |
| TT-03 | `simulation/timing_both_test.yaml` | Ambas zonas criticas. | PASS |
| TT-04 | `simulation/timing_load_test.yaml` | Diagnostico bajo carga. | PASS |
| TT-05 | `simulation/timing_phase_test.yaml` | Evento desplazado respecto al periodo de muestreo. | PASS |
| TT-06 | `simulation/run_timing_measurements.ps1` | Repeticion automatizada. | PASS |
