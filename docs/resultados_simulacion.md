# Resultados de simulacion SIGAS-RT

## Alcance

Estos resultados corresponden al prototipo academico ejecutado en Wokwi CLI. No representan una certificacion industrial ni validacion sobre una instalacion real de gas.

## Resumen

| Grupo | Evidencia | Resultado |
| --- | --- | --- |
| HW | Compilacion PlatformIO y arranque de perifericos simulados | PASS |
| IT | Integracion FreeRTOS con colas y tareas separadas | PASS |
| CL | Logica critica, enclavamiento, falso positivo, rearme y timeout | PASS |
| TT | Medicion temporal repetida | PASS |

## Tiempo real

| Metrica | Valor |
| --- | ---: |
| Corridas medidas | 25 |
| Deadline `RT-03` | 500000 us |
| WORT observado | 22504 us |
| Margen observado | 477496 us |
| Fallas | 0 |

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
- `docs/analisis_temporal.md`
- `docs/resultados_temporales.md`
- `docs/matriz_trazabilidad.md`
