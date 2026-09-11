# Resultados de simulacion SIGAS-RT

## Alcance

Este documento conserva la referencia historica y registra la campana temporal
final del prototipo academico ejecutada en Wokwi CLI. No representa una
certificacion industrial ni validacion sobre una instalacion real de gas.

## Resumen

| Grupo | Evidencia | Resultado |
| --- | --- | --- |
| HW | Compilacion PlatformIO y arranque de perifericos simulados | PASS HISTORICO WOKWI |
| IT | Integracion FreeRTOS con colas y tareas separadas | PASS HISTORICO WOKWI |
| CL | Logica critica, enclavamiento, falso positivo, rearme y timeout | PASS WOKWI FINAL |
| TT | Medicion temporal repetida | PASS WOKWI FINAL, 25/25 corridas |

## Campanas temporales

| Campana | Revision | Corridas | Deadline `RT-03` | Worst Observed Response Time | Margen | Fallas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Historica anterior | Revision historica | 25 | 500000 us | 22504 us | 477496 us | 0 |
| Temporal final | `679b489abe2d166ed1c0a60a50c5b4c0baa9d195` | 25 | 500000 us | 22346 us | 477654 us (95.5308 %) | 0 |

El firmware critico medido en la campana final es equivalente al commit
`9ae0c351a17d3f7b37aae30eeda405836dfe81bc`. El prototipo simulado cumplio el
deadline experimental de 500000 us en las 25 corridas ejecutadas.

La medicion de `RT-03` usa:

```text
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED
```

Tambien se registra `T_ACTUATOR_APPLIED` como evidencia adicional de escritura de GPIO/PWM, pero el fin fisico de movimiento del servo no se certifica en Wokwi.

## Seguridad

El firmware normal arranca en `SYSTEM_STARTUP` con la valvula simulada cerrada. Solo pasa a `SYSTEM_NORMAL` despues de confirmar muestras seguras. Si no aparece la primera muestra o si se pierde la telemetria de sensor despues de una muestra valida, el sistema entra en `SYSTEM_FAULT` y ordena cierre seguro.

## Artefactos

- `simulation/results/timing_runs.csv`
- `simulation/results/timing_summary.csv`
- `simulation/results/wcet_observed.csv`
- `simulation/results/wcet_summary.csv`
- `simulation/results/final_validation_manifest.json`
- `docs/analisis_temporal.md`
- `docs/resultados_temporales.md`
- `docs/matriz_trazabilidad.md`
