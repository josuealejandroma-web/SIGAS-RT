# Resultados temporales SIGAS-RT

Los valores de este documento proceden de las 25 corridas Wokwi historicas
existentes. No fueron reemplazados durante la correccion local A04/A05/M05.
El arbol actual requiere una nueva regresion temporal Wokwi para producir
resultados finales vigentes.

## Resumen

| Campo | Valor |
| --- | ---: |
| Corridas temporales totales | 25 |
| Corridas normales | 20 |
| Corridas con carga diagnostica | 5 |
| Deadline RT-03 | 500000 us |
| PASS | 25 |
| FAIL | 0 |
| Worst Observed Response Time | 22504 us |
| Margen temporal | 477496 us |
| Margen porcentual | 95.50 % |

## Estadisticas

| Grupo | Metrica | Min us | Promedio us | Max us |
| --- | --- | ---: | ---: | ---: |
| Normal | `confirmation_time_us` | 200050 | 200051.35 | 200052 |
| Normal | `post_confirmation_received_us` | 22413 | 22449.9 | 22504 |
| Normal | `post_confirmation_applied_us` | 22930 | 22967.15 | 23021 |
| Normal | `end_to_end_received_us` | 222465 | 222501.25 | 222554 |
| Diagnostico con carga | `confirmation_time_us` | 200051 | 200051.8 | 200052 |
| Diagnostico con carga | `post_confirmation_received_us` | 22413 | 22431 | 22502 |
| Diagnostico con carga | `post_confirmation_applied_us` | 22931 | 22948.6 | 23019 |
| Diagnostico con carga | `end_to_end_received_us` | 222465 | 222482.8 | 222554 |

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
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED = 22504 us
```

No se denomina WCRT formal. El termino usado para el maximo medido es Worst Observed Response Time.

## Observed Execution Time

`simulation/results/wcet_summary.csv` se regenera exclusivamente desde
`wcet_observed.csv` mediante `simulation/generate_wcet_summary.py`:

| Tarea | Count | Min us | Average us | Max us |
| --- | ---: | ---: | ---: | ---: |
| `TaskActuator` | 25 | 1004 | 1005.64 | 1007 |
| `TaskSafety` | 50 | 1837 | 2117.20 | 2435 |
| `TaskSensors` | 50 | 2737 | 2976.60 | 3309 |

Estos son tiempos de ejecucion observados en la campana historica, no cotas
formales de WCET.

## CL-10

`simulation/sensor_timeout_test.yaml` se ejecuto con la variante `esp32doit-devkit-v1-sensor-timeout-test`.

Resultado:

```text
SYSTEM_STARTUP -> SYSTEM_FAULT -> SAFE_CLOSE
```

PASS.

## Archivos de evidencia

| Archivo | Contenido |
| --- | --- |
| `simulation/results/timing_runs.csv` | Corridas individuales con timestamps y tiempos derivados. |
| `simulation/results/timing_summary.csv` | Estadisticas por grupo y metrica. |
| `simulation/results/wcet_observed.csv` | Maximos observados reportados por tarea durante corridas. |
| `simulation/results/wcet_summary.csv` | Resumen determinista `count/min/average/max` de tiempos de ejecucion observados; no es WCET formal. |
