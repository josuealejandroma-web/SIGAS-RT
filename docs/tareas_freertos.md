# Diseno de tareas FreeRTOS

La Fase 2 debe separar adquisicion, seguridad, actuacion, indicadores y diagnostico. `loop()` no debe contener la logica critica; solo puede quedar como tarea ociosa con `vTaskDelay()`.

## Tabla de tareas

| Tarea | Tipo | Periodo | Prioridad propuesta | Deadline | Funcion |
| --- | --- | --- | --- | --- | --- |
| `TaskSensorZona1` | Periodica | 100 ms | Alta | 100 ms | Leer ADC Zona 1, timestamp y publicar muestra. |
| `TaskSensorZona2` | Periodica | 100 ms | Alta | 100 ms | Leer ADC Zona 2, timestamp y publicar muestra. |
| `TaskSafety` | Evento/periodica corta | Cola con timeout 50 ms | Muy alta | 500 ms desde `T_detect` a `T_command` | Evaluar muestras, confirmar criticidad, administrar estados y emitir comando seguro. |
| `TaskActuator` | Evento | Inmediata al comando | Maxima o equivalente justificada | 500 ms compartido con `TaskSafety` | Cerrar valvula simulada, activar buzzer y estado critico. |
| `TaskIndicators` | Periodica | 250 ms | Baja | No critico | Actualizar LED verde/rojo segun estado publicado. |
| `TaskDiagnostics` | Periodica | 500 ms | Baja | No critico | Enviar por Serial ADC bruto, zona, estado, timestamps y mediciones temporales. |

Prioridad propuesta numerica para ESP32/Arduino FreeRTOS:

| Tarea | Prioridad |
| --- | --- |
| `TaskActuator` | 5 |
| `TaskSafety` | 4 |
| `TaskSensorZona1` | 3 |
| `TaskSensorZona2` | 3 |
| `TaskIndicators` | 1 |
| `TaskDiagnostics` | 1 |

## Comunicacion entre tareas

Mecanismos previstos:

- `QueueHandle_t sensorQueue`: recibe muestras ADC de ambas zonas.
- `QueueHandle_t actuatorQueue`: recibe comandos de actuacion desde `TaskSafety`.
- `EventGroupHandle_t systemEvents`: publica banderas de estado para indicadores y diagnostico.
- `QueueHandle_t diagnosticsQueue`: opcional si el volumen de mensajes seriales afecta tareas criticas.

No se deben usar variables globales compartidas sin proteccion para datos que cambian en mas de una tarea. Si se necesita estado global de solo lectura para indicadores, debe actualizarse mediante queue, event group o seccion critica breve.

## Periodicidad

Las tareas de sensores deben usar `vTaskDelayUntil()`:

```cpp
TickType_t lastWake = xTaskGetTickCount();
for (;;) {
  // leer ADC y publicar muestra
  vTaskDelayUntil(&lastWake, SENSOR_PERIOD_TICKS);
}
```

Esto reduce deriva temporal frente a `delay()` y permite estimar mejor la latencia de confirmacion en el prototipo.

## Estados del sistema

Estados minimos:

| Estado | Descripcion | Salidas |
| --- | --- | --- |
| `ESTADO_NORMAL` | Ambas zonas bajo umbral experimental seguro. | Valvula abierta, LED verde ON, LED rojo OFF, buzzer OFF. |
| `ESTADO_ADVERTENCIA` | Al menos una zona supera umbral, pendiente de confirmacion. | Valvula abierta, diagnostico activo, sin cierre automatico todavia. |
| `ESTADO_CRITICO` | Condicion peligrosa confirmada. | Orden de cierre, buzzer ON, LED rojo ON, LED verde OFF. |
| `ESTADO_SEGURO_BLOQUEADO` | Sistema enclavado despues de criticidad. | Valvula cerrada, LED rojo ON, buzzer ON o patron de alarma definido. |

Transiciones:

```text
NORMAL -> ADVERTENCIA
ADVERTENCIA -> NORMAL
ADVERTENCIA -> CRITICO
CRITICO -> SEGURO_BLOQUEADO
SEGURO_BLOQUEADO -> NORMAL solo con boton de rearme y sensores seguros
```

## Estrategia de confirmacion

Estrategia seleccionada para Fase 2: N muestras consecutivas por zona.

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

El deadline RT-03 no mide el tiempo de filtrado previo. RT-03 mide desde `T_detect`, momento de confirmacion, hasta `T_command`, momento en que la CPU emite la orden al actuador.

## Medicion temporal

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
- Mantener la valvula cerrada hasta rearme explicito despues de estado critico.
