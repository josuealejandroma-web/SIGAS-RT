# Diseno de tareas FreeRTOS

La Fase 2 separa adquisicion, seguridad, actuacion y diagnostico. `loop()` no contiene logica critica; queda como tarea ociosa con `vTaskDelay()`.

## Tabla de tareas implementada

| Tarea | Tipo | Periodo | Prioridad | Deadline | Funcion |
| --- | --- | --- | --- | --- | --- |
| `TaskSensors` | Periodica | 100 ms | 3 | 100 ms | Leer ADC Zona 1 y Zona 2, timestamp monotono, boton y publicar una muestra consistente. |
| `TaskSafety` | Evento con timeout | Cola con timeout 50 ms | 4 | Ver `docs/analisis_temporal.md` | Clasificar, aplicar histeresis, confirmar condicion critica, enclavar estado seguro y validar rearme. |
| `TaskActuator` | Evento | Inmediata al comando | 5 | Ver `docs/analisis_temporal.md` | Control exclusivo de servo, buzzer, LED verde y LED rojo durante operacion normal. |
| `TaskDiagnostics` | Periodica | 500 ms | 1 | No critico | Enviar por Serial muestras, decisiones, timestamps y estado de boton. |

`TaskIndicators` queda absorbida por `TaskActuator` para cumplir una regla simple: durante operacion normal, una sola tarea controla todos los actuadores fisicos. Si mas adelante se separan indicadores no criticos, deberan recibir estado sin tocar directamente el cierre seguro.

## Prioridades

| Tarea | Prioridad |
| --- | --- |
| `TaskActuator` | 5 |
| `TaskSafety` | 4 |
| `TaskSensors` | 3 |
| `TaskDiagnostics` | 1 |

La prioridad relativa implementada es:

```text
TaskActuator > TaskSafety > TaskSensors > TaskDiagnostics
```

`TaskActuator` tiene prioridad maxima para aplicar el comando de cierre ya calculado. `TaskSafety` queda por encima de adquisicion y diagnostico para procesar muestras recibidas sin depender de salidas no criticas.

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

## Estados criticos implementados

| Estado | Descripcion | Salidas |
| --- | --- | --- |
| `SYSTEM_NORMAL` | Ambas zonas bajo condicion de advertencia. | Valvula abierta, LED verde ON, LED rojo OFF, buzzer OFF. |
| `SYSTEM_WARNING` | Al menos una zona en advertencia o una condicion alta aun no confirmada. | Valvula abierta, LED verde ON, LED rojo ON, buzzer OFF. |
| `SYSTEM_CRITICAL` | Condicion alta confirmada por N muestras consecutivas. | Orden inmediata de cierre seguro. |
| `SYSTEM_SAFE_LATCHED` | Estado seguro enclavado despues de condicion critica. | Valvula cerrada, buzzer ON, LED rojo ON, LED verde OFF. |
| `SYSTEM_FAULT` | Falla detectada, por ejemplo timeout de datos de sensor. | Valvula cerrada, buzzer ON, LED rojo ON, LED verde OFF. |

## Clasificacion experimental implementada

Los umbrales son `SIMULATION_ONLY` y no representan ppm certificados:

| Constante | Valor | Uso |
| --- | --- | --- |
| `ADC_WARNING_ENTER_SIMULATION_ONLY` | 1400 | Entrada a advertencia. |
| `ADC_WARNING_EXIT_SIMULATION_ONLY` | 1000 | Salida de advertencia por histeresis. |
| `ADC_CRITICAL_SIMULATION_ONLY` | 3000 | Candidato critico. |
| `ADC_SAFE_EXIT_SIMULATION_ONLY` | 1000 | Condicion segura para rearme. |

Con los valores observados en Wokwi, 410 clasifica como `NORMAL`, 2048 como `WARNING` y 3686 como `HIGH`.

## Confirmacion y enclavamiento

La condicion critica requiere `CRITICAL_CONFIRMATION_SAMPLES = 3` muestras altas con `sequence` consecutivo en cualquiera de las dos zonas. La suma usa semantica `uint32_t`, por lo que `0xFFFFFFFF -> 0` es continua. Si `xQueueOverwrite()` hace visible un salto, ambos candidatos se reinician antes de tratar la muestra nueva. Con periodo de sensores de 100 ms, la confirmacion ocurre aproximadamente 300 ms despues del inicio de una fuga sostenida simulada.

Un pico aislado no cierra la valvula: el contador vuelve a cero si la zona deja de estar alta antes de llegar a 3 muestras. Al confirmar, `TaskSafety` registra `T_FIRST_HIGH`, `T_CRITICAL_CONFIRMED` y `T_COMMAND_SENT`, envia `SAFE_CLOSE` y pasa a `SYSTEM_SAFE_LATCHED`.

El sistema no reabre automaticamente aunque ambas zonas vuelvan a normal. El rearme manual solo se acepta cuando:

- ambas zonas cumplen `ADC_SAFE_EXIT_SIMULATION_ONLY`;
- existen `SAFE_RESET_CONFIRMATION_SAMPLES = 3` muestras seguras;
- el boton permanece estable `RESET_DEBOUNCE_SAMPLES = 2` muestras.

## Politica fail-safe

La politica implementada es cerrar ante condicion critica confirmada o falla de datos de sensor. Si `TaskSafety` deja de recibir muestras despues de haber recibido al menos una muestra valida durante `SENSOR_DATA_TIMEOUT_US = 350000`, entra en `SYSTEM_FAULT` y ordena `SAFE_CLOSE`. Una muestra recibida con edad mayor o igual a 350000 us tambien se rechaza como stale y entra en el mismo mecanismo; no puede clasificar, confirmar ni contribuir al rearme.

La falla de creacion de colas o tareas se maneja en el arranque desde
`src/system_app.cpp`. Cada tarea espera suspendida en el guard de activacion;
solo se reanudan las cuatro cuando la topologia esta completa. Si una creacion
falla, el guard queda enclavado y el estado `SAFE_CLOSE` se reaplica
periodicamente, por lo que una topologia parcial no puede actuar.

## Medicion temporal

Variables logicas:

| Nombre | Definicion |
| --- | --- |
| `T_FIRST_HIGH` | Timestamp monotono en microsegundos de la primera muestra alta candidata. |
| `T_CRITICAL_CONFIRMED` | Timestamp monotono en microsegundos al confirmar condicion critica. |
| `T_COMMAND_SENT` | Timestamp monotono en microsegundos al publicar orden de cierre a `TaskActuator`. |
| `T_ACTUATOR_RECEIVED` | Timestamp monotono en microsegundos al recibir el comando en `TaskActuator`. |
| `T_ACTUATOR_APPLIED` | Timestamp monotono despues de escribir salidas de actuacion. |
| `ResponseTimeSoftware` | `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED`. |
| `ResponseTimeActuatorQueue` | `T_ACTUATOR_RECEIVED - T_COMMAND_SENT`. |

No se debe mezclar la orden al actuador con el movimiento fisico completo del actuador. En simulacion, el servo representa una valvula academica, no una valvula certificada.

El analisis temporal final del prototipo simulado esta documentado en `docs/analisis_temporal.md`. El maximo observado para `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED` fue 22504 us frente a un deadline de 500000 us.

## Reglas de implementacion

- No usar `delay()` dentro de tareas criticas.
- No hacer busy waiting.
- No imprimir en exceso desde tareas de alta prioridad.
- No depender de Internet para detectar ni cerrar.
- No tratar ADC crudo como ppm certificado.
- Mantener diagnostico serial como funcion secundaria.
- Mantener la valvula cerrada hasta rearme explicito despues de estado alto experimental.
