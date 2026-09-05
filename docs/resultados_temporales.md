# Resultados temporales SIGAS-RT

## Resumen

| Campo | Valor |
| --- | ---: |
| Corridas temporales totales | 25 |
| Corridas normales | 20 |
| Corridas con carga diagnostica | 5 |
| Deadline RT-03 | 500000 us |
| PASS | 25 |
| FAIL | 0 |
| Worst Observed Response Time | 23123 us |
| Margen temporal | 476877 us |
| Margen porcentual | 95.38 % |

## Estadisticas

| Grupo | Metrica | Min us | Promedio us | Max us |
| --- | --- | ---: | ---: | ---: |
| Normal | `confirmation_time_us` | 200049 | 200051.1 | 200052 |
| Normal | `post_confirmation_response_us` | 23122 | 23122.7 | 23123 |
| Normal | `end_to_end_us` | 223172 | 223173.8 | 223175 |
| Diagnostico con carga | `confirmation_time_us` | 200051 | 200051.6 | 200052 |
| Diagnostico con carga | `post_confirmation_response_us` | 23122 | 23122.6 | 23123 |
| Diagnostico con carga | `end_to_end_us` | 223174 | 223174.2 | 223175 |

## Resultados TT

| Caso | Escenario | Corridas | Resultado |
| --- | --- | ---: | --- |
| TT-01 | `simulation/timing_test.yaml` | 5 | PASS |
| TT-02 | `simulation/timing_zone2_test.yaml` | 5 | PASS |
| TT-03 | `simulation/timing_both_test.yaml` | 5 | PASS |
| TT-04 | `simulation/timing_load_test.yaml` | 5 | PASS |
| TT-05 | `simulation/timing_phase_test.yaml` | 5 | PASS |
| TT-06 | `simulation/run_timing_measurements.ps1` | 25 | PASS |

## WORT

El peor tiempo observado para `RT-03` fue:

```text
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED = 23123 us
```

No se denomina WCRT formal. El termino usado para el maximo medido es Worst Observed Response Time.

## CL-10

`simulation/sensor_timeout_test.yaml` se ejecuto con la variante `esp32doit-devkit-v1-sensor-timeout-test`.

Resultado:

```text
SYSTEM_NORMAL -> SYSTEM_FAULT -> SAFE_CLOSE
```

PASS.

## Archivos de evidencia

| Archivo | Contenido |
| --- | --- |
| `simulation/results/timing_runs.csv` | Corridas individuales con timestamps y tiempos derivados. |
| `simulation/results/timing_summary.csv` | Estadisticas por grupo y metrica. |
| `simulation/results/wcet_observed.csv` | Maximos observados reportados por tarea durante corridas. |
| `simulation/results/wcet_summary.csv` | Resumen por tarea del peor tiempo de ejecucion observado. |
