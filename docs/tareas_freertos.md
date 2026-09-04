# Diseno de tareas FreeRTOS

La Fase 2 separa adquisicion, seguridad, actuacion y diagnostico. `loop()` no contiene logica critica; queda como tarea ociosa con `vTaskDelay()`.

## Tabla de tareas implementada

| Tarea | Tipo | Periodo | Prioridad | Deadline | Funcion |
| --- | --- | --- | --- | --- | --- |
| `TaskSensors` | Periodica | 100 ms | 3 | 100 ms | Leer ADC Zona 1 y Zona 2, timestamp, boton y publicar una muestra consistente. |
| `TaskSafety` | Evento con timeout | Cola con timeout 50 ms | 4 | No medido formalmente en este bloque | Clasificar muestras con umbrales experimentales Wokwi-only y emitir comando. |
| `TaskActuator` | Evento | Inmediata al comando | 5 | No medido formalmente en este bloque | Control exclusivo de servo, buzzer, LED verde y LED rojo durante operacion normal. |
| `TaskDiagnostics` | Periodica | 500 ms | 1 | No critico | Enviar por Serial muestras, decisiones, timestamps y estado de boton. |

`TaskIndicators` queda absorbida por `TaskActuator` en este bloque para cumplir una regla simple: durante operacion normal, una sola tarea controla todos los actuadores fisicos. Si mas adelante se separan indicadores no criticos, deberan recibir estado sin tocar directamente el cierre seguro.

## Prioridades

| Tarea | Prioridad |
| --- | --- |
| `TaskActuator` | 5 |
| `TaskSafety` | 4 |
| `TaskSensors` | 3 |
| `TaskDiagnostics` | 1 |

La prioridad relativa implementada es:

```text
TaskActuator / TaskSafety > TaskSensors > TaskDiagnostics
```

## Comunicacion entre tareas

Mecanismos implementados:

- `QueueHandle_t sensorQueue`: recibe muestras ADC atomicas de ambas zonas.
- `QueueHandle_t actuatorQueue`: recibe comandos de actuacion desde `TaskSafety`.
- `QueueHandle_t diagnosticsSampleQueue`: recibe la ultima muestra para diagnostico.
- `QueueHandle_t diagnosticsDecisionQueue`: recibe la ultima decision para diagnostico.

Las colas tienen longitud 1 y se actualizan con `xQueueOverwrite()` porque la integracion necesita el valor mas reciente, no un backlog de muestras antiguas. No se usan variables globales compartidas como mecanismo principal de comunicacion entre tareas.

## Periodicidad

`TaskSensors` usa `vTaskDelayUntil()`:

```cpp
TickType_t lastWake = xTaskGetTickCount();
for (;;) {
  // leer ADC y publicar muestra
  vTaskDelayUntil(&lastWake, SENSOR_PERIOD);
}
```

`TaskDiagnostics` tambien usa `vTaskDelayUntil()` para limitar la carga del Serial Monitor. `TaskSafety` y `TaskActuator` bloquean sobre colas FreeRTOS; no hacen busy waiting.

## Estados logicos de integracion

| Estado | Descripcion | Salidas |
| --- | --- | --- |
| `NORMAL` | Ambas zonas bajo umbral experimental seguro. | Valvula abierta, LED verde ON, LED rojo OFF, buzzer OFF. |
| `WARNING` | Al menos una zona supera el umbral experimental de advertencia. | Valvula abierta, LED verde ON, LED rojo ON, buzzer OFF. |
| `HIGH` / `SAFE_CLOSE` | Al menos una zona supera el umbral alto experimental. | Orden de cierre, buzzer ON, LED rojo ON, LED verde OFF. |

## Clasificacion experimental implementada

Este bloque no implementa confirmacion final por N muestras, filtrado ni histeresis. La clasificacion usada solo integra el flujo concurrente:

| Nivel | Condicion Wokwi-only |
| --- | --- |
| `NORMAL` | ADC menor que `ADC_WARNING_THRESHOLD_SIMULATION_ONLY`. |
| `WARNING` | ADC mayor o igual que `ADC_WARNING_THRESHOLD_SIMULATION_ONLY` y menor que `ADC_HIGH_THRESHOLD_SIMULATION_ONLY`. |
| `HIGH` | ADC mayor o igual que `ADC_HIGH_THRESHOLD_SIMULATION_ONLY`. |

Con los valores observados en Wokwi, 410 clasifica como `NORMAL`, 2048 como `WARNING` y 3686 como `HIGH`.

Cuando aparece `HIGH`, `TaskSafety` emite `SAFE_CLOSE` y mantiene el cierre enclavado de forma experimental. El boton se detecta y registra, pero la politica final de rearme queda pendiente.

## Estrategia de confirmacion futura

Estrategia seleccionada para el siguiente bloque: N muestras consecutivas por zona.

Propuesta:

- umbral critico experimental: definido en `include/config.h`;
- contador independiente por zona;
- condicion critica confirmada si cualquier zona acumula 3 muestras consecutivas sobre umbral;
- contador se reduce o reinicia cuando la zona cae bajo umbral seguro experimental;
- no reapertura automatica despues de bloqueo.

Justificacion:

- rechaza un pico aislado;
- es facil de trazar en logs;
- su latencia es acotada;
- con periodo de 100 ms y 3 muestras, la confirmacion ocurre aproximadamente en 300 ms desde una fuga sostenida simulada.

El deadline RT-03 no se mide formalmente en este bloque. RT-03 debe medir desde `T_detect`, momento de confirmacion, hasta `T_command`, momento en que la CPU emite la orden al actuador.

## Medicion temporal futura

Variables logicas:

| Nombre | Definicion |
| --- | --- |
| `T_detect` | `millis()` al confirmar condicion critica. |
| `T_command` | `millis()` al publicar orden de cierre a `TaskActuator`. |
| `T_valve_closed` | `millis()` cuando el servo alcanza o se ordena la posicion cerrada simulada, segun capacidad de medicion. |
| `ResponseTimeSoftware` | `T_command - T_detect`. |
| `ResponseTimeTotal` | `T_valve_closed - T_detect`. |

No se debe mezclar la orden al actuador con el movimiento fisico completo del actuador. En simulacion, el servo representa una valvula academica, no una valvula certificada.

## Reglas de implementacion

- No usar `delay()` dentro de tareas criticas.
- No hacer busy waiting.
- No imprimir en exceso desde tareas de alta prioridad.
- No depender de Internet para detectar ni cerrar.
- No tratar ADC crudo como ppm certificado.
- Mantener diagnostico serial como funcion secundaria.
- Mantener la valvula cerrada hasta rearme explicito despues de estado alto experimental.
