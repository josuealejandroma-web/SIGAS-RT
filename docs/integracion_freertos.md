# Integracion FreeRTOS SIGAS-RT

## 1. Objetivo

Este bloque verifica la arquitectura concurrente Sensor -> ADC -> CPU -> Actuador. No constituye validacion final de seguridad, certificacion Hard Real-Time ni una cota temporal analitica garantizada.

## 2. Arquitectura de tareas

| Tarea | Responsabilidad |
| --- | --- |
| `TaskSensors` | Lee periodicamente GPIO34 y GPIO35 con `analogRead()`, lee el boton de rearme, agrega timestamp y publica `SensorSample`. |
| `TaskSafety` | Consume muestras, clasifica cada zona con umbrales experimentales solo para Wokwi, confirma condicion critica y genera comandos de actuacion. |
| `TaskActuator` | Es la unica tarea que controla servo, buzzer, LED verde y LED rojo durante operacion normal. |
| `TaskDiagnostics` | Imprime estado no critico por Serial a baja prioridad. |

`loop()` no contiene logica de aplicacion; queda como tarea ociosa con `vTaskDelay()`.

## 3. Prioridades

| Tarea | Prioridad |
| --- | --- |
| `TaskActuator` | 5 |
| `TaskSafety` | 4 |
| `TaskSensors` | 3 |
| `TaskDiagnostics` | 1 |

La ruta de decision y actuacion queda por encima de diagnostico. `TaskActuator` tiene la prioridad maxima para aplicar los comandos recibidos.

## 4. Periodos

| Elemento | Valor |
| --- | --- |
| `TaskSensors` | 100 ms con `vTaskDelayUntil()` |
| `TaskSafety` | Evento por cola, timeout 50 ms |
| `TaskActuator` | Evento por cola, espera bloqueante |
| `TaskDiagnostics` | 500 ms con `vTaskDelayUntil()` |

Se respeta el periodo de sensores documentado previamente. La medicion temporal final del prototipo simulado esta en `docs/analisis_temporal.md`.

## 5. Queues

| Queue | Origen | Destino | Dato |
| --- | --- | --- | --- |
| `sensorQueue` | `TaskSensors` | `TaskSafety` | `SensorSample` |
| `actuatorQueue` | `TaskSafety` | `TaskActuator` | `ActuatorCommand` |
| `diagnosticsSampleQueue` | `TaskSensors` | `TaskDiagnostics` | `SensorSample` |
| `diagnosticsDecisionQueue` | `TaskSafety` | `TaskDiagnostics` | `SafetyDecision` |

Las colas tienen longitud 1 y usan `xQueueOverwrite()` para mantener el ultimo dato valido sin acumular backlog. Como esta semantica puede omitir muestras, `TaskSafety` valida `SensorSample.sequence`: un salto invalida ambos candidatos `HIGH` antes de contar la muestra nueva. No se usa polling continuo ni busy waiting entre tareas.

## 6. Estructuras intercambiadas

| Estructura | Campos principales |
| --- | --- |
| `SensorSample` | `adcZone1`, `adcZone2`, `resetPressed`, `timestampUs`, `sequence` |
| `SafetyDecision` | Estado, niveles, accion, razon, salidas ordenadas (`commandedValveAngle`, buzzer y LEDs), timestamps y `sequence` |
| `ActuatorCommand` | `action`, `valveAngle`, `buzzerOn`, `greenLedOn`, `redLedOn`, timestamps, `sequence` |

Estas estructuras separan adquisicion, decision y actuacion. La politica de salidas se calcula una sola vez en `TaskSafety`, se copia de forma coherente a `SafetyDecision` y `ActuatorCommand`, y se aplica exclusivamente en `TaskActuator`. Diagnostico no vuelve a decidir las salidas.

Los candidatos criticos se mantienen por zona. Si una zona deja `HIGH` antes
de confirmar, su contador y su timestamp candidato se reinician. Cuando una o
ambas zonas confirman, `T_FIRST_HIGH` toma el inicio del candidato confirmado;
si ambas confirman simultaneamente se elige el mas antiguo.

Antes de procesar, la edad de la muestra se calcula con el reloj monotono de
`esp_timer_get_time()`. Una edad `>= SENSOR_DATA_TIMEOUT_US` no actualiza
niveles, candidatos ni rearme: produce `SYSTEM_FAULT` y `SAFE_CLOSE`.

`T_COMMAND_SENT` se captura inmediatamente antes de publicar en
`actuatorQueue`, se copia con el mismo valor en `SafetyDecision` y
`ActuatorCommand`, y se registra despues de `xQueueOverwrite()`. Esta marca no
representa movimiento fisico completado del servo.

## 7. Flujo de informacion

```text
GPIO34/GPIO35
    |
    v
TaskSensors
    |
    v
sensorQueue -> TaskSafety -> actuatorQueue -> TaskActuator
    |              |
    +--------------+-> queues de diagnostico -> TaskDiagnostics
```

## 7.1 Seleccion de artefactos Wokwi

Cada build genera `firmware.bin`, `firmware-merged.bin` y `firmware.elf`
dentro de `.pio/build/<environment>/`. Antes de ejecutar Wokwi, el selector
prepara juntos los tres archivos en `.pio/wokwi/current/` y escribe ahi un
manifest local con el entorno y las rutas de origen. Todo ese staging esta
ignorado por Git.

Ejemplo:

```powershell
python visualization\bridge\firmware_artifacts.py `
  --repo-root . `
  --simulation-dir simulation `
  --environment esp32doit-devkit-v1
```

La preparacion falla si falta BIN o ELF, si el manifest corresponde a otro
entorno, si el contenido preparado esta obsoleto o si `wokwi.toml` no apunta
al par seleccionado. `scenario_runner.py` transporta el entorno del catalogo
hasta esta preparacion y valida el resultado antes de iniciar Wokwi.

## 8. Modo smoke test

El hardware smoke test anterior se conserva, pero queda aislado del firmware
normal mediante el flag de compilacion `SIGAS_RT_HARDWARE_SMOKE_TEST`. El
boton `resetBtn` no selecciona modos durante el arranque y GPIO23 se usa
exclusivamente como rearme en runtime normal.

Entorno dedicado:

```powershell
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-hardware-smoke
python visualization\bridge\firmware_artifacts.py --repo-root . --simulation-dir simulation --environment esp32doit-devkit-v1-hardware-smoke
```

Comando:

```powershell
cd simulation
..\tools\wokwi-cli.exe --timeout 30000 --scenario hardware_smoke_test.yaml --serial-log-file wokwi-serial-smoke.log .
```

## 9. Modo operacion FreeRTOS

El modo FreeRTOS es el unico arranque del firmware normal, sin depender del
estado fisico de `resetBtn` al encender.

Comando:

```powershell
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
python visualization\bridge\firmware_artifacts.py --repo-root . --simulation-dir simulation --environment esp32doit-devkit-v1
cd simulation
..\tools\wokwi-cli.exe --timeout 45000 --scenario freertos_integration_test.yaml --serial-log-file wokwi-serial-freertos.log .
```

## 10. Umbrales experimentales

Los limites estan centralizados en `include/config.h` y marcados como `SIMULATION_ONLY`:

| Constante | Valor |
| --- | --- |
| `ADC_WARNING_ENTER_SIMULATION_ONLY` | 1400 |
| `ADC_WARNING_EXIT_SIMULATION_ONLY` | 1000 |
| `ADC_CRITICAL_SIMULATION_ONLY` | 3000 |
| `ADC_SAFE_EXIT_SIMULATION_ONLY` | 1000 |

Estos valores solo clasifican lecturas ADC crudas de Wokwi. No equivalen a ppm ni a un umbral comercial de seguridad.

## 11. Resultados de pruebas

| Caso | Estimulo | Resultado |
| --- | --- | --- |
| IT-01 NORMAL | Z1=410, Z2=410 | `TaskSensors` publica muestra, `TaskSafety` decide `NORMAL`, `TaskActuator` abre valvula, buzzer OFF, verde ON, rojo OFF. |
| IT-02 ZONA 1 HIGH | Z1=3686, Z2=410 | `TaskSafety` confirma Z1 `HIGH` despues de 3 muestras y emite `SAFE_CLOSE`. |
| IT-03 ZONA 2 HIGH | Z1=410, Z2=3686 | `TaskSafety` confirma Z2 `HIGH` despues de 3 muestras y mantiene `SAFE_CLOSE`. |
| IT-04 AMBAS HIGH | Z1=3686, Z2=3686 | Ambas zonas `HIGH`, accion `SAFE_CLOSE`. |
| IT-05 INDEPENDENCIA | Z1=2048/Z2=410 y luego Z1=410/Z2=2048 | Cada canal cambia de forma separada y se clasifica como `WARNING` solo en la zona modificada. |

El escenario `simulation/freertos_integration_test.yaml` termino correctamente con Wokwi CLI.

## 12. Limitaciones

- La clasificacion es logica de integracion experimental para Wokwi, no algoritmo certificado de seguridad.
- La confirmacion por multiples muestras, histeresis, enclavamiento, rearme seguro y timeout de datos de sensor ya estan implementados; una cota temporal analitica garantizada queda fuera de este bloque.
- El cierre queda enclavado despues de condicion critica confirmada; el boton reabre solo con ambas zonas seguras y debounce cumplido.
- Los valores ADC provienen de simulacion y no representan concentracion certificada de gas.
