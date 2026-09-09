# Logica critica SIGAS-RT

## Objetivo

Implementar una logica critica simulada para ESP32/FreeRTOS que conserve la ruta:

```text
Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador
```

Esta logica usa lecturas ADC crudas de Wokwi. No convierte a ppm ni certifica seguridad real de una instalacion de gas.

## Maquina de estados

| Estado | Entrada principal | Salida |
| --- | --- | --- |
| `SYSTEM_NORMAL` | Ambas zonas por debajo de advertencia. | Valvula abierta, buzzer OFF, LED verde ON, LED rojo OFF. |
| `SYSTEM_WARNING` | Al menos una zona en advertencia o candidato alto sin confirmar. | Valvula abierta, buzzer OFF, LED verde ON, LED rojo ON. |
| `SYSTEM_CRITICAL` | Una zona llega a 3 muestras altas consecutivas. | Emision de orden `SAFE_CLOSE`. |
| `SYSTEM_SAFE_LATCHED` | Cierre seguro enclavado. | Valvula cerrada, buzzer ON, LED verde OFF, LED rojo ON. |
| `SYSTEM_FAULT` | Falla de datos de sensor. | Valvula cerrada, buzzer ON, LED verde OFF, LED rojo ON. |

Transiciones principales:

```text
SYSTEM_NORMAL -> SYSTEM_WARNING       si una zona entra en WARNING o HIGH candidato
SYSTEM_WARNING -> SYSTEM_NORMAL       si ambas zonas vuelven a NORMAL
SYSTEM_WARNING -> SYSTEM_CRITICAL     si una zona confirma HIGH con N muestras
SYSTEM_CRITICAL -> SYSTEM_SAFE_LATCHED despues de publicar SAFE_CLOSE
SYSTEM_SAFE_LATCHED -> SYSTEM_NORMAL  solo por reset manual seguro y estable
SYSTEM_* -> SYSTEM_FAULT              ante timeout de datos de sensor
SYSTEM_FAULT -> SYSTEM_NORMAL         solo por reset manual seguro y estable
```

## Umbrales e histeresis

| Constante | Valor | Funcion |
| --- | --- | --- |
| `ADC_WARNING_ENTER_SIMULATION_ONLY` | 1400 | Entrada a advertencia. |
| `ADC_WARNING_EXIT_SIMULATION_ONLY` | 1000 | Salida de advertencia. |
| `ADC_CRITICAL_SIMULATION_ONLY` | 3000 | Candidato critico. |
| `ADC_SAFE_EXIT_SIMULATION_ONLY` | 1000 | Condicion segura para rearme. |

La histeresis evita oscilar entre `NORMAL` y `WARNING` cuando la lectura baja de 1400 pero se mantiene por encima de 1000.

## Confirmacion

La condicion critica se confirma con `CRITICAL_CONFIRMATION_SAMPLES = 3` muestras consecutivas `HIGH` en cualquiera de las dos zonas. Con `SENSOR_PERIOD = 100 ms`, la latencia de confirmacion esperada es aproximadamente 300 ms desde el inicio de la condicion alta sostenida.

Un pico aislado genera candidato `HIGH`, pero no emite `SAFE_CLOSE` si no llega a 3 muestras.

## Enclavamiento y reset

Despues de confirmar condicion critica, `TaskSafety` emite `SAFE_CLOSE` y pasa a `SYSTEM_SAFE_LATCHED`. El sistema no reabre automaticamente cuando las lecturas vuelven a normal.

El reset manual se acepta solo si:

- ambas zonas estan bajo `ADC_SAFE_EXIT_SIMULATION_ONLY`;
- hay `SAFE_RESET_CONFIRMATION_SAMPLES = 3` muestras seguras consecutivas;
- se observo el boton liberado despues de entrar al estado fail-safe;
- el boton permanece estable `RESET_DEBOUNCE_SAMPLES = 2` muestras.

La misma politica se aplica a `SYSTEM_SAFE_LATCHED` y `SYSTEM_FAULT`. La
recuperacion de muestras no abre la valvula por si sola. Si el reset se
solicita con alguna zona insegura, el sistema registra rechazo y permanece
enclavado.

## Fail-safe y fallas

Ante timeout de datos de sensor, `TaskSafety` entra a `SYSTEM_FAULT` y ordena `SAFE_CLOSE`. El umbral es `SENSOR_DATA_TIMEOUT_US = 350000` despues de haber recibido al menos una muestra valida.

Ante falla de creacion de cola o tarea FreeRTOS, `src/system_app.cpp` enclava
el guard de arranque, mantiene las tareas creadas suspendidas y reaplica el
estado de actuacion seguro. Las cuatro tareas se activan solamente despues de
completar la topologia de inicializacion.

El hardware smoke test no se selecciona mediante el boton del producto. Solo
se compila como modo de arranque con `SIGAS_RT_HARDWARE_SMOKE_TEST`; en el
firmware normal GPIO23 queda reservado al rearme.

La deteccion de ADC desconectado, ruido fisico real y sensores fuera de rango certificados queda pendiente para una fase posterior con modelo electrico y criterios de diagnostico mas estrictos.

## Timestamps

Se usa `esp_timer_get_time()` como fuente monotona en microsegundos:

| Timestamp | Punto de captura |
| --- | --- |
| `T_FIRST_HIGH` | Primera muestra alta candidata. |
| `T_CRITICAL_CONFIRMED` | Confirmacion de 3 muestras altas consecutivas. |
| `T_COMMAND_SENT` | Publicacion del comando hacia `TaskActuator`. |
| `T_ACTUATOR_RECEIVED` | Recepcion del comando por `TaskActuator`. |

En una corrida Wokwi de referencia, Zona 1 produjo:

| Timestamp | Valor observado |
| --- | --- |
| `T_FIRST_HIGH` | 4128019 us |
| `T_CRITICAL_CONFIRMED` | 4328066 us |
| `T_COMMAND_SENT` | 4328066 us |
| `T_ACTUATOR_RECEIVED` | 4351184 us |

`T_COMMAND_SENT - T_CRITICAL_CONFIRMED = 0 us` en esa corrida porque la orden se publica inmediatamente al confirmar. `T_ACTUATOR_RECEIVED - T_COMMAND_SENT = 23118 us` en la cola de actuacion simulada.

## Pruebas CL

| Caso | Cobertura | Escenario |
| --- | --- | --- |
| CL-01 | Estado normal, salidas normales. | `critical_logic_test.yaml` |
| CL-02 | Advertencia sin cierre. | `critical_logic_test.yaml` |
| CL-03 | Histeresis de advertencia. | `critical_logic_test.yaml` |
| CL-04 | Pico alto aislado sin `SAFE_CLOSE`. | `critical_logic_spike_test.yaml` con `--fail-text SAFE_CLOSE` |
| CL-05 | Zona 1 alta sostenida confirma condicion critica. | `critical_logic_test.yaml` |
| CL-06 | Enclavamiento despues de volver a normal. | `critical_logic_test.yaml` |
| CL-07 | Reset rechazado con zona insegura. | `critical_logic_test.yaml` |
| CL-08 | Reset aceptado con ambas zonas seguras y debounce. | `critical_logic_test.yaml` |
| CL-09 | Zona 2 alta y ambas zonas altas. | `critical_logic_test.yaml` |
| CL-10 | Timeout de datos de sensor entra en `SYSTEM_FAULT`. | `sensor_timeout_test.yaml` con build flag `SIGAS_RT_SENSOR_TIMEOUT_TEST`. |

## Trazabilidad preliminar

| Requisito | Implementacion | Prueba |
| --- | --- | --- |
| RF-05 | `classifyZone()` con umbral de advertencia e histeresis. | CL-02, CL-03 |
| RF-06 | Contadores `highCountZone1` y `highCountZone2`. | CL-04, CL-05, CL-09 |
| RF-07/RF-08/RS-04 | `buildActuatorCommand()` y `TaskActuator`. | CL-05, CL-09 |
| RF-11/RF-12/RS-03 | `SYSTEM_SAFE_LATCHED`. | CL-06 |
| RF-13 | `safeSamples`, `resetStableSamples`, reset aceptado/rechazado. | CL-07, CL-08 |
| RF-15/RT-03/RT-07 | Timestamps monotonicos en decision y actuador. | CL-05 |
| RS-08/RS-09 | `SAFE_CLOSE` ante critica confirmada o timeout. | CL-05, CL-10 |
