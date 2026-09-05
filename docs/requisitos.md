# Requisitos SIGAS-RT Fase 2

Los umbrales definidos para Wokwi son umbrales experimentales de simulacion. No representan concentraciones certificadas de gas ni valores ppm reales.

## Requisitos funcionales

| ID | Requisito |
| --- | --- |
| RF-01 | El sistema debe leer el sensor de gas de Zona 1. |
| RF-02 | El sistema debe leer el sensor de gas de Zona 2. |
| RF-03 | El sistema debe convertir las senales analogicas mediante ADC del ESP32. |
| RF-04 | El sistema debe registrar valor ADC bruto, zona, timestamp y estado calculado. |
| RF-05 | El sistema debe detectar una condicion de advertencia cuando al menos una zona supera el umbral experimental de simulacion. |
| RF-06 | El sistema debe confirmar una condicion critica mediante multiples muestras consecutivas. |
| RF-07 | El sistema debe activar una alarma sonora al confirmar condicion critica. |
| RF-08 | El sistema debe ordenar el cierre de la valvula simulada al confirmar condicion critica. |
| RF-09 | El sistema debe encender LED verde en estado normal. |
| RF-10 | El sistema debe encender LED rojo en estado critico o seguro bloqueado. |
| RF-11 | El sistema debe permanecer en estado seguro bloqueado despues de una condicion critica. |
| RF-12 | El sistema no debe reabrir automaticamente la valvula cuando el valor ADC vuelva a normal. |
| RF-13 | El sistema debe permitir rearme manual mediante boton solo cuando ambas zonas esten por debajo del umbral seguro experimental. |
| RF-14 | El sistema debe soportar fuga en Zona 1, Zona 2 y fuga simultanea. |
| RF-15 | El sistema debe registrar timestamps monotonicos para primera muestra alta, confirmacion critica, comando enviado, recepcion por actuador y salidas aplicadas. |

## Requisitos de tiempo real

| ID | Requisito |
| --- | --- |
| RT-01 | Las tareas de adquisicion de sensores deben ejecutarse periodicamente. |
| RT-02 | Las tareas periodicas deben usar `vTaskDelayUntil()` en lugar de `delay()` para temporizacion normal. |
| RT-03 | Desde la confirmacion de condicion critica (`T_CRITICAL_CONFIRMED`) hasta la recepcion del comando por `TaskActuator` (`T_ACTUATOR_RECEIVED`) no deben transcurrir mas de 500 ms en el prototipo simulado. |
| RT-04 | `TaskSafety` debe tener prioridad superior a tareas visuales y de diagnostico. |
| RT-05 | `TaskActuator` debe tener prioridad maxima o equivalente justificada para ejecutar la orden de cierre. |
| RT-06 | `TaskDiagnostics` no debe bloquear la ejecucion de tareas criticas. |
| RT-07 | La medicion temporal debe diferenciar `ResponseTimeSoftware = T_command - T_detect` de `ResponseTimeTotal = T_valve_closed - T_detect` cuando este ultimo pueda estimarse. |

Nota: antes del bloque de analisis temporal, `RT-03` estaba formulado hasta la emision del comando (`T_command`). Para este bloque se hizo explicito el criterio mas estricto solicitado: medir hasta `T_ACTUATOR_RECEIVED`.

## Requisitos de seguridad

| ID | Requisito |
| --- | --- |
| RS-01 | La funcion critica debe operar localmente sin Internet. |
| RS-02 | Una tarea secundaria no debe impedir la ejecucion de la funcion de seguridad. |
| RS-03 | Una vez activado el estado critico, el sistema debe permanecer en estado seguro hasta rearme explicito. |
| RS-04 | Ante condicion critica confirmada, el sistema debe activar alarma, indicar estado critico y ordenar cierre de valvula. |
| RS-05 | Los sensores MQ y el servomotor no deben presentarse como elementos certificados para instalacion real de gas. |
| RS-06 | La documentacion no debe incluir instrucciones para modificar una instalacion domiciliaria real. |
| RS-07 | Ningun secreto, token o credencial debe almacenarse en el repositorio. |
| RS-08 | El sistema debe adoptar filosofia fail-safe ante una condicion critica confirmada. |
| RS-09 | Ante perdida de datos de sensor despues de una muestra valida, el sistema debe pasar a falla y ordenar cierre seguro. |
| RS-10 | Durante arranque, antes de confirmar muestras seguras, la valvula simulada debe permanecer cerrada y el sistema debe operar en estado seguro. |
| RS-11 | Ante ausencia de la primera muestra de sensor, el sistema debe pasar a falla y ordenar cierre seguro. |

## Requisitos de hardware

| ID | Requisito |
| --- | --- |
| RH-01 | El microcontrolador objetivo debe ser ESP32. |
| RH-02 | Las entradas de gas deben usar senales analogicas AO. |
| RH-03 | Los sensores de gas deben conectarse preferentemente a canales ADC1 del ESP32. |
| RH-04 | El actuador de corte debe representarse mediante un servo en simulacion. |
| RH-05 | El sistema debe incluir buzzer, LED verde, LED rojo y boton de rearme. |
| RH-06 | El pinout debe documentarse en `docs/arquitectura_sistema.md`. |

## Requisitos de simulacion

| ID | Requisito |
| --- | --- |
| RSim-01 | El proyecto debe compilar con PlatformIO sin errores. |
| RSim-02 | Wokwi debe iniciar correctamente con `simulation/wokwi.toml`. |
| RSim-03 | Las pruebas deben ejecutarse con Wokwi CLI/MCP sin imprimir `WOKWI_CLI_TOKEN`. |
| RSim-04 | Deben existir escenarios HW, IT, CL y TT para validar hardware simulado, integracion FreeRTOS, fugas, falso positivo, deadline, timeout, arranque seguro y rearme. |
| RSim-05 | Los resultados reales de simulacion deben documentarse en `docs/resultados_simulacion.md`. |
| RSim-06 | La matriz de trazabilidad debe relacionar requisitos, componentes, codigo, pruebas y resultados. |
| RSim-07 | La visualizacion Godot debe consumir telemetria local sin modificar la logica critica de seguridad. |
| RSim-08 | El bridge de visualizacion debe rechazar comandos directos de actuador y solo permitir escenarios de prueba definidos. |

## Restricciones

| ID | Restriccion |
| --- | --- |
| RC-01 | No implementar pagina web. |
| RC-02 | No implementar APK ni aplicacion movil. |
| RC-03 | No implementar servidor. |
| RC-04 | No usar base de datos. |
| RC-05 | No usar MQTT ni servicios cloud para la funcion critica. |
| RC-06 | No modificar archivos fuera del repositorio SIGAS-RT. |
| RC-07 | No reescribir commits anteriores ni hacer force push. |
| RC-08 | No concentrar toda la logica en `loop()`. |
| RC-09 | No usar entradas digitales DO del sensor como mecanismo principal de deteccion. |
| RC-10 | No afirmar que Wokwi certifica comportamiento hard real-time. |
