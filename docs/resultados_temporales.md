# Resultados temporales SIGAS-RT

La campana temporal final se ejecuto sobre el commit de repositorio
`679b489abe2d166ed1c0a60a50c5b4c0baa9d195` con firmware critico equivalente
al commit `9ae0c351a17d3f7b37aae30eeda405836dfe81bc`.

## Campana historica anterior

La evidencia anterior se conserva solo como referencia: 25 corridas, Worst
Observed Response Time de 22504 us, margen de 477496 us y 0 fallas de deadline.
Los CSV actuales corresponden exclusivamente a la campana temporal final.

## Resumen

| Campo | Valor |
| --- | ---: |
| Corridas temporales totales | 25 |
| Corridas normales | 20 |
| Corridas con carga diagnostica | 5 |
| Deadline RT-03 | 500000 us |
| Corridas PASS finales | 25 |
| Corridas FAIL finales | 0 |
| Worst Observed Response Time | 22346 us |
| Margen temporal | 477654 us |
| Margen porcentual | 95.5308 % |

## Estadisticas

Las estadisticas siguientes fueron calculadas directamente desde
`timing_runs.csv`. P95 y P99 usan rango mas cercano, igual que el script de la
campana.

| Grupo | Metrica | Count | Min us | Promedio us | Mediana us | Max us | Desv. est. us | P95 us | P99 us |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | `confirmation_us` | 20 | 200057 | 200058.15 | 200058 | 200059 | 0.57 | 200059 | 200059 |
| Normal | `command_latency_us` | 20 | 22241 | 22270.85 | 22241 | 22326 | 40.47 | 22326 | 22326 |
| Normal | `dispatch_latency_us` | 20 | 19 | 32.25 | 39 | 40 | 9.31 | 39 | 40 |
| Normal | `actuator_apply_us` | 20 | 364 | 424.45 | 365 | 536 | 81.86 | 536 | 536 |
| Normal | `post_confirmation_received_us` | 20 | 22280 | 22303.10 | 22280.5 | 22346 | 31.17 | 22346 | 22346 |
| Normal | `post_confirmation_applied_us` | 20 | 22644 | 22727.55 | 22645 | 22882 | 113.02 | 22882 | 22882 |
| Normal | `end_to_end_received_us` | 20 | 222337 | 222361.25 | 222339 | 222404 | 31.06 | 222404 | 222404 |
| Normal | `end_to_end_applied_us` | 20 | 222702 | 222785.70 | 222703 | 222940 | 112.91 | 222940 | 222940 |
| Diagnostico con carga | `confirmation_us` | 5 | 200058 | 200058.00 | 200058 | 200058 | 0.00 | 200058 | 200058 |
| Diagnostico con carga | `command_latency_us` | 5 | 22241 | 22292.20 | 22326 | 22326 | 41.40 | 22326 | 22326 |
| Diagnostico con carga | `dispatch_latency_us` | 5 | 20 | 27.80 | 20 | 40 | 9.56 | 40 | 40 |
| Diagnostico con carga | `actuator_apply_us` | 5 | 364 | 467.20 | 536 | 536 | 84.26 | 536 | 536 |
| Diagnostico con carga | `post_confirmation_received_us` | 5 | 22281 | 22320.00 | 22346 | 22346 | 31.84 | 22346 | 22346 |
| Diagnostico con carga | `post_confirmation_applied_us` | 5 | 22645 | 22787.20 | 22882 | 22882 | 116.11 | 22882 | 22882 |
| Diagnostico con carga | `end_to_end_received_us` | 5 | 222339 | 222378.00 | 222404 | 222404 | 31.84 | 222404 | 222404 |
| Diagnostico con carga | `end_to_end_applied_us` | 5 | 222703 | 222845.20 | 222940 | 222940 | 116.11 | 222940 | 222940 |

## Resultados TT

| Caso | Escenario | Corridas | Resultado |
| --- | --- | ---: | --- |
| TT-01 | `simulation/timing_test.yaml` | 5 | PASS WOKWI FINAL |
| TT-02 | `simulation/timing_zone2_test.yaml` | 5 | PASS WOKWI FINAL |
| TT-03 | `simulation/timing_both_test.yaml` | 5 | PASS WOKWI FINAL |
| TT-04 | `simulation/timing_load_test.yaml` | 5 | PASS WOKWI FINAL |
| TT-05 | `simulation/timing_phase_test.yaml` | 5 | PASS WOKWI FINAL |
| TT-06 | `simulation/run_timing_measurements.ps1` | 25 | PASS WOKWI FINAL |

## Worst Observed Response Time

El peor tiempo observado para `RT-03` fue:

```text
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED = 22346 us
margin_us = 500000 - 22346 = 477654 us
margin_percent = 95.5308 %
```

El maximo medido se denomina exclusivamente Worst Observed Response Time; no es
una cota analitica ni una garantia fisica.

## Latencia de confirmacion

Sobre las 25 corridas, `T_CRITICAL_CONFIRMED - T_FIRST_HIGH` tuvo minimo
200057 us, promedio 200058.12 us, mediana 200058 us, maximo 200059 us, P95
200059 us y P99 200059 us.

Con `N=3` muestras y periodo de 100 ms, esto representa aproximadamente 200 ms
desde la primera muestra `HIGH` observada hasta la tercera que confirma. Desde
un cruce fisico arbitrario la latencia conceptual puede ser aproximadamente
200-300 ms mas interferencias; la simulacion no establece una garantia fisica.

## Latencias internas globales

| Intervalo | Min us | Promedio us | Max us |
| --- | ---: | ---: | ---: |
| `T_COMMAND_SENT - T_CRITICAL_CONFIRMED` | 22241 | 22275.12 | 22326 |
| `T_ACTUATOR_RECEIVED - T_COMMAND_SENT` | 19 | 31.36 | 40 |
| `T_ACTUATOR_APPLIED - T_ACTUATOR_RECEIVED` | 364 | 433.00 | 536 |
| `T_ACTUATOR_APPLIED - T_CRITICAL_CONFIRMED` | 22644 | 22739.48 | 22882 |
| `T_ACTUATOR_RECEIVED - T_FIRST_HIGH` | 222337 | 222364.60 | 222404 |
| `T_ACTUATOR_APPLIED - T_FIRST_HIGH` | 222702 | 222797.60 | 222940 |

## Observed Execution Time

`simulation/results/wcet_summary.csv` se regenera exclusivamente desde
`wcet_observed.csv` mediante `simulation/generate_wcet_summary.py`:

| Tarea | Count | Min us | Average us | Max us |
| --- | ---: | ---: | ---: | ---: |
| `TaskActuator` | 25 | 847 | 980.76 | 1008 |
| `TaskSafety` | 49 | 1766 | 1831.84 | 1895 |
| `TaskSensors` | 49 | 2584 | 2704.53 | 2765 |

Estos son valores de Observed Execution Time de la campana final, no cotas
garantizadas.

## CL-10

`simulation/sensor_timeout_test.yaml` se ejecuto con la variante `esp32doit-devkit-v1-sensor-timeout-test`.

Resultado:

```text
SYSTEM_STARTUP -> SYSTEM_FAULT -> SAFE_CLOSE
```

PASS WOKWI FINAL.

## Archivos de evidencia

| Archivo | Contenido |
| --- | --- |
| `simulation/results/timing_runs.csv` | Corridas individuales con timestamps y tiempos derivados. |
| `simulation/results/timing_summary.csv` | Estadisticas por grupo y metrica. |
| `simulation/results/wcet_observed.csv` | Maximos observados reportados por tarea durante corridas. |
| `simulation/results/wcet_summary.csv` | Resumen determinista `count/min/average/max` de Observed Execution Time. |
| `simulation/results/final_validation_manifest.json` | Revision, conteos, deadline, margen, versiones y SHA-256 de los cuatro CSV. |
