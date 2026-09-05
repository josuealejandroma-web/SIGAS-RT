# Analisis temporal SIGAS-RT

## Objetivo

Determinar con mediciones repetidas si la ruta critica simulada:

```text
Sensor -> ADC -> TaskSensors -> sensorQueue -> TaskSafety -> actuatorQueue -> TaskActuator
```

cumple el deadline experimental definido para el prototipo academico SIGAS-RT.

Los resultados temporales corresponden a una simulacion ejecutada en Wokwi y permiten verificar el comportamiento temporal del prototipo academico. No constituyen certificacion de un sistema Hard Real-Time sobre hardware fisico.

## Deadline

`RT-03` se evalua como:

```text
T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED <= 500000 us
```

Antes de este bloque, `RT-03` estaba escrito hasta `T_command`. La formulacion usada aqui es mas estricta porque incluye la recepcion efectiva del comando por `TaskActuator`.

## Timestamps

| Timestamp | Definicion |
| --- | --- |
| `T_FIRST_HIGH` | Primera muestra ADC clasificada como `HIGH`. |
| `T_CRITICAL_CONFIRMED` | Confirmacion de 3 muestras `HIGH` consecutivas. |
| `T_COMMAND_SENT` | Publicacion del comando en `actuatorQueue`. |
| `T_ACTUATOR_RECEIVED` | Recepcion del comando por `TaskActuator`. |

Tiempos calculados:

| Tiempo | Formula |
| --- | --- |
| `confirmation_time_us` | `T_CRITICAL_CONFIRMED - T_FIRST_HIGH` |
| `command_latency_us` | `T_COMMAND_SENT - T_CRITICAL_CONFIRMED` |
| `dispatch_latency_us` | `T_ACTUATOR_RECEIVED - T_COMMAND_SENT` |
| `post_confirmation_response_us` | `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED` |
| `end_to_end_us` | `T_ACTUATOR_RECEIVED - T_FIRST_HIGH` |

## Metodologia

Se agrego instrumentacion con `esp_timer_get_time()` y logs compactos `[TIMING]` y `[WCET_OBSERVED]`. Las corridas se automatizaron con `simulation/run_timing_measurements.ps1`, que genera:

- `simulation/results/timing_runs.csv`
- `simulation/results/timing_summary.csv`
- `simulation/results/wcet_observed.csv`

Se ejecutaron 25 corridas temporales:

- 20 corridas normales para TT-01, TT-02, TT-03 y TT-05.
- 5 corridas con carga artificial controlada en `TaskDiagnostics` para TT-04.

## Resultados temporales

| Grupo | Metrica | Min us | Promedio us | Mediana us | Max us | P95 us | P99 us |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | `confirmation_time_us` | 200049 | 200051.1 | 200051 | 200052 | 200052 | 200052 |
| Normal | `post_confirmation_response_us` | 23122 | 23122.7 | 23123 | 23123 | 23123 | 23123 |
| Normal | `end_to_end_us` | 223172 | 223173.8 | 223174 | 223175 | 223175 | 223175 |
| Diagnostico con carga | `confirmation_time_us` | 200051 | 200051.6 | 200052 | 200052 | 200052 | 200052 |
| Diagnostico con carga | `post_confirmation_response_us` | 23122 | 23122.6 | 23123 | 23123 | 23123 | 23123 |
| Diagnostico con carga | `end_to_end_us` | 223174 | 223174.2 | 223174 | 223175 | 223175 | 223175 |

## Worst Observed Response Time

El maximo observado para el criterio `RT-03` fue:

```text
Worst Observed Response Time (WORT) = 23123 us
Deadline = 500000 us
Safety Margin = 476877 us
MarginPercent = 95.38 %
```

Todas las corridas medidas cumplieron el deadline:

| runs_total | passes | fails | worst_response_us | deadline_us | margin_us |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 25 | 25 | 0 | 23123 | 500000 | 476877 |

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

La prueba TT-04 compilo una variante con `SIGAS_RT_DIAGNOSTICS_LOAD`, que ejecuta una carga artificial controlada en `TaskDiagnostics`. El peor `post_confirmation_response_us` bajo carga fue 23123 us, igual al peor valor normal. La tarea de diagnostico no impidio la ejecucion de `TaskSafety` ni de `TaskActuator` en estas mediciones.

## Utilizacion observada

Maximos observados de ejecucion:

| Tarea | C observado max us | Periodo considerado | Utilizacion |
| --- | ---: | ---: | ---: |
| `TaskSensors` | 3088 | 100000 us | 0.03088 |
| `TaskDiagnostics` | No instrumentada como WCET critico | 500000 us | No calculada |

Para las tareas event-driven no se aplica una utilizacion periodica directa sin asumir una tasa maxima de eventos. Como cota informativa, si se toma una activacion por muestra de sensor:

| Tarea | C observado max us | Periodo hipotetico | Utilizacion informativa |
| --- | ---: | ---: | ---: |
| `TaskSafety` | 26367 | 100000 us | 0.26367 |
| `TaskActuator` | 856 | 100000 us | 0.00856 |

Con esa hipotesis, la suma informativa para la ruta critica seria:

```text
U_total ~= (3088 + 26367 + 856) / 100000 = 0.30311
```

Este valor no es una prueba formal de planificabilidad RMS. El maximo de `TaskSafety` incluye salida Serial de instrumentacion durante la transicion critica, por lo que es una cota observada conservadora del prototipo instrumentado. Las prioridades no fueron asignadas estrictamente por periodo; fueron asignadas por criticidad funcional. Un analisis RMS solo seria valido bajo supuestos adicionales de tareas periodicas independientes, deadlines relativos iguales a periodos y prioridades monotonicamente asignadas por periodo.

## WCRT observado y analitico

El maximo medido se reporta como WORT, no como WCRT formal:

```text
WORT = 23123 us
```

No se presenta un WCRT analitico formal porque la ejecucion ocurre en Wokwi, sobre Arduino/FreeRTOS, con simulacion y sin una caracterizacion completa de interrupciones, tiempos de libreria, temporizacion del host ni modelo certificado del actuador.

## Movimiento fisico del servo

La medicion termina en `T_ACTUATOR_RECEIVED`, cuando `TaskActuator` recibe y aplica el comando de cierre al servo simulado. No se midio `T_VALVE_CLOSED` como fin fisico del movimiento. Wokwi no proporciona en este montaje una senal independiente y fiable para certificar el fin de movimiento del servo.

El servomotor simulado no representa tiempos reales de una electrovalvula certificada.

## Limitaciones

- Los resultados dependen de Wokwi CLI y del host que ejecuta la simulacion.
- La instrumentacion usa Serial para evidencia; se mantuvo compacta, pero sigue siendo observabilidad de prototipo.
- `T_FIRST_HIGH` mide primera muestra alta observada, no instante fisico exacto del evento.
- El timeout CL-10 se automatizo con build flag de prueba, sin alterar el firmware normal.
- No hay certificacion industrial ni validacion sobre hardware fisico.

## Interpretacion

El prototipo simulado cumple `RT-03` en todas las corridas ejecutadas. El margen observado es amplio frente a 500 ms, pero debe interpretarse como evidencia experimental del prototipo, no como garantia hard real-time formal.
