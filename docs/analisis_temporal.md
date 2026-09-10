# Analisis temporal SIGAS-RT

## Objetivo

Determinar con mediciones repetidas si la ruta critica simulada:

```text
Sensor -> ADC -> TaskSensors -> sensorQueue -> TaskSafety -> actuatorQueue -> TaskActuator
```

cumple el deadline experimental definido para el prototipo academico SIGAS-RT.

Los resultados temporales corresponden a una simulacion ejecutada previamente
en Wokwi y permiten verificar el comportamiento temporal de aquella revision
del prototipo academico. No constituyen certificacion de un sistema Hard
Real-Time sobre hardware fisico ni evidencia temporal final del arbol actual.

## Deadline

`RT-03` se evalua como:

```text
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED <= 500000 us
```

Antes de este bloque, `RT-03` estaba escrito hasta `T_command`. La formulacion usada aqui es mas estricta porque incluye la recepcion efectiva del comando por `TaskActuator`.

## Timestamps

| Timestamp | Definicion |
| --- | --- |
| `T_FIRST_HIGH` | Primera muestra del candidato `HIGH` consecutivo de la zona que finalmente confirma la condicion critica. Un pico descartado no se conserva. |
| `T_CRITICAL_CONFIRMED` | Confirmacion de 3 muestras `HIGH` consecutivas. |
| `T_COMMAND_SENT` | Timestamp capturado inmediatamente antes de `xQueueOverwrite(actuatorQueue, command)` e insertado en `SafetyDecision` y `ActuatorCommand`; el log se emite despues de publicar. |
| `T_ACTUATOR_RECEIVED` | Recepcion del comando por `TaskActuator`. |
| `T_ACTUATOR_APPLIED` | Salidas GPIO/PWM aplicadas por `TaskActuator`. |

Tiempos calculados:

| Tiempo | Formula |
| --- | --- |
| `confirmation_time_us` | `T_CRITICAL_CONFIRMED - T_FIRST_HIGH` |
| `command_latency_us` | `T_COMMAND_SENT - T_CRITICAL_CONFIRMED` |
| `dispatch_latency_us` | `T_ACTUATOR_RECEIVED - T_COMMAND_SENT` |
| `actuator_apply_us` | `T_ACTUATOR_APPLIED - T_ACTUATOR_RECEIVED` |
| `post_confirmation_received_us` | `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED` |
| `post_confirmation_applied_us` | `T_ACTUATOR_APPLIED - T_CRITICAL_CONFIRMED` |
| `end_to_end_received_us` | `T_ACTUATOR_RECEIVED - T_FIRST_HIGH` |
| `end_to_end_applied_us` | `T_ACTUATOR_APPLIED - T_FIRST_HIGH` |

## Metodologia

Se agrego instrumentacion con `esp_timer_get_time()` y logs compactos `[TIMING]` y `[WCET_OBSERVED]`. Las corridas se automatizaron con `simulation/run_timing_measurements.ps1`, que genera:

- `simulation/results/timing_runs.csv`
- `simulation/results/timing_summary.csv`
- `simulation/results/wcet_observed.csv`
- `simulation/results/wcet_summary.csv`

`simulation/generate_wcet_summary.py` regenera de forma determinista el
resumen de tiempos de ejecucion observados desde `wcet_observed.csv`. El
archivo historico conserva su nombre, pero no representa un WCET formal.

La campaña historica contiene 25 corridas temporales:

- 20 corridas normales para TT-01, TT-02, TT-03 y TT-05.
- 5 corridas con carga artificial controlada en `TaskDiagnostics` para TT-04.

El arbol actual, que incorpora A04, A05 y M05 sobre `f155e190`, requiere una
nueva regresion Wokwi antes de declarar resultados temporales finales. Esa
regresion no forma parte de este bloque.

## Resultados temporales historicos

| Grupo | Metrica | Min us | Promedio us | Mediana us | Max us | P95 us | P99 us |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | `confirmation_time_us` | 200050 | 200051.35 | 200052 | 200052 | 200052 | 200052 |
| Normal | `post_confirmation_received_us` | 22413 | 22449.9 | 22419 | 22504 | 22504 | 22504 |
| Normal | `post_confirmation_applied_us` | 22930 | 22967.15 | 22936 | 23021 | 23021 | 23021 |
| Normal | `end_to_end_received_us` | 222465 | 222501.25 | 222469 | 222554 | 222554 | 222554 |
| Diagnostico con carga | `confirmation_time_us` | 200051 | 200051.8 | 200052 | 200052 | 200052 | 200052 |
| Diagnostico con carga | `post_confirmation_received_us` | 22413 | 22431 | 22413 | 22502 | 22502 | 22502 |
| Diagnostico con carga | `post_confirmation_applied_us` | 22931 | 22948.6 | 22931 | 23019 | 23019 | 23019 |
| Diagnostico con carga | `end_to_end_received_us` | 222465 | 222482.8 | 222465 | 222554 | 222554 | 222554 |

## Worst Observed Response Time

El maximo observado para el criterio `RT-03` fue:

```text
Worst Observed Response Time (WORT) = 22504 us
Deadline = 500000 us
Safety Margin = 477496 us
MarginPercent = 95.50 %
```

Todas las corridas medidas cumplieron el deadline:

| runs_total | passes | fails | worst_response_us | deadline_us | margin_us |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 25 | 25 | 0 | 22504 | 500000 | 477496 |

## Periodicidad y confirmacion

`TaskSensors` muestrea cada 100 ms. La confirmacion requiere 3 muestras consecutivas `HIGH`.

Si la fuga aparece justo antes de una lectura, la primera muestra alta se toma casi inmediatamente y las dos siguientes llegan aproximadamente a +100 ms y +200 ms. Por eso una medicion cercana a 200 ms para:

```text
T_CRITICAL_CONFIRMED - T_FIRST_HIGH
```

es coherente: `T_FIRST_HIGH` ya es la primera muestra alta capturada, no el instante fisico exacto en que empezo la fuga.

Si se midiera desde el instante real de aparicion de gas, el rango teorico aproximado para obtener 3 muestras altas seria mayor:

```text
200 ms <= tiempo hasta confirmacion < 300 ms
```

dependiendo de la fase relativa entre el evento fisico y el periodo de muestreo. Esto no debe confundirse con el tiempo de ejecucion de `TaskSensors`, que fue medido en microsegundos.

## Prioridades y preempcion

| Tarea | Tipo | Prioridad | Criticidad | Interferencia |
| --- | --- | ---: | --- | --- |
| `TaskActuator` | Event-driven por cola | 5 | Critica | Aplica comando de cierre. |
| `TaskSafety` | Event-driven por cola con timeout | 4 | Critica | Procesa muestras y decide estado. |
| `TaskSensors` | Periodica, 100 ms | 3 | Critica de adquisicion | Publica muestra mas reciente. |
| `TaskDiagnostics` | Periodica, 500 ms | 1 | No critica | Puede consumir CPU y Serial, pero tiene menor prioridad. |

La prueba TT-04 compilo una variante con `SIGAS_RT_DIAGNOSTICS_LOAD`, que ejecuta una carga artificial controlada en `TaskDiagnostics`. El peor `post_confirmation_received_us` bajo carga fue 22502 us. La tarea de diagnostico no impidio la ejecucion de `TaskSafety` ni de `TaskActuator` en estas mediciones.

## Utilizacion observada

Tiempos de ejecucion observados regenerados desde
`simulation/results/wcet_observed.csv`:

| Tarea | Muestras | Min us | Promedio us | Max us |
| --- | ---: | ---: | ---: | ---: |
| `TaskActuator` | 25 | 1004 | 1005.64 | 1007 |
| `TaskSafety` | 50 | 1837 | 2117.20 | 2435 |
| `TaskSensors` | 50 | 2737 | 2976.60 | 3309 |

Maximos observados usados para la estimacion informativa:

| Tarea | C observado max us | Periodo considerado | Utilizacion |
| --- | ---: | ---: | ---: |
| `TaskSensors` | 3309 | 100000 us | 0.03309 |
| `TaskDiagnostics` | No instrumentada como WCET critico | 500000 us | No calculada |

Para las tareas event-driven no se aplica una utilizacion periodica directa sin asumir una tasa maxima de eventos. Como cota informativa, si se toma una activacion por muestra de sensor:

| Tarea | C observado max us | Periodo hipotetico | Utilizacion informativa |
| --- | ---: | ---: | ---: |
| `TaskSafety` | 2435 | 100000 us | 0.02435 |
| `TaskActuator` | 1007 | 100000 us | 0.01007 |

Con esa hipotesis, la suma informativa para la ruta critica seria:

```text
U_total ~= (3309 + 2435 + 1007) / 100000 = 0.06751
```

Este valor no es una prueba formal de planificabilidad RMS. Las prioridades no fueron asignadas estrictamente por periodo; fueron asignadas por criticidad funcional. Un analisis RMS solo seria valido bajo supuestos adicionales de tareas periodicas independientes, deadlines relativos iguales a periodos y prioridades monotonicamente asignadas por periodo.

## WCRT observado y analitico

El maximo medido se reporta como WORT, no como WCRT formal:

```text
WORT = 22504 us
```

No se presenta un WCRT analitico formal porque la ejecucion ocurre en Wokwi, sobre Arduino/FreeRTOS, con simulacion y sin una caracterizacion completa de interrupciones, tiempos de libreria, temporizacion del host ni modelo certificado del actuador.

## Movimiento fisico del servo

El requisito `RT-03` termina en `T_ACTUATOR_RECEIVED`, cuando `TaskActuator` recibe el comando de cierre. Adicionalmente se registra `T_ACTUATOR_APPLIED`, despues de escribir servo, buzzer y LEDs. No se midio `T_VALVE_CLOSED` como fin fisico del movimiento. Wokwi no proporciona en este montaje una senal independiente y fiable para certificar el fin de movimiento del servo.

El servomotor simulado no representa tiempos reales de una electrovalvula certificada.

## Limitaciones

- Los resultados dependen de Wokwi CLI y del host que ejecuta la simulacion.
- La instrumentacion usa Serial para evidencia; se mantuvo compacta, pero sigue siendo observabilidad de prototipo.
- `T_FIRST_HIGH` mide el inicio del candidato alto que confirma; cada zona
  mantiene su propio candidato y lo descarta si deja `HIGH`. Si ambas zonas
  confirman en la misma evaluacion se usa el candidato confirmado mas antiguo.
- Los valores de las 25 corridas son historicos y deben renovarse para validar
  temporalmente el arbol posterior a A04/A05/M05.
- El timeout CL-10 se automatizo con build flag de prueba, sin alterar el firmware normal.
- No hay certificacion industrial ni validacion sobre hardware fisico.

## Interpretacion

El prototipo simulado cumple `RT-03` en todas las corridas ejecutadas. El margen observado es amplio frente a 500 ms, pero debe interpretarse como evidencia experimental del prototipo, no como garantia hard real-time formal.
