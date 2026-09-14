# Auditoria de la base V1

Inspeccion: codigo, diagram.json, escenarios, bridge, scripts Blender y docs.
Base limpia y sincronizada con origin al iniciar V2: `435db425`.

| Area | Implementacion realmente observada |
| --- | --- |
| Hardware | ESP32 DOIT DevKit V1; MQ2 x2, potenciometros de estimulo x2, servo, buzzer, dos LEDs, rearme |
| ADC | Z1 GPIO34, Z2 GPIO35; MQ2 AOUT y potenciometro SIG comparten nodo en cada zona |
| Salidas | Servo18, buzzer19, LED21/22; reset23; UART0 TX/RX |
| Tareas | Sensors prioridad3/100ms; Safety4/cola con timeout50ms; Actuator5/portMAX_DELAY; Diagnostics1/500ms; core1 |
| Colas | Muestra, comando, muestra diagnostico y decision diagnostico: longitud1 con overwrite |
| Seguridad | HIGH 3 muestras, histeresis1400/1000/3000 ADC; stale350ms; rearme estable y deliberado |
| Telemetria | @SIGAS state periodico y [TIMING]; no schema_version ni ID de corrida |
| Blender | 13 componentes LIVE, receiver/Queue/timer, camara interior1..529/24fps/15markers |
| Bridge | Catalogo cerrado, WokwiScenarioRunner, UDP45702 comandos/45701 datos |

## Inconsistencias a no trasladar

1. `simulation/diagram.json` une dos fuentes analogicas por ADC. V2 separara
   el MQ2 del estimulo automatizado; nunca justificara esa union como circuito real.
2. En `create_gas_system.py`, la derivacion cocina esta en x=-3.35 y la
   automatica en x=-0.45. El flujo dibujado desde x=-6.2 hacia x=3.4 deja cocina
   aguas arriba de la automatica: esa geometria no representa corte maestro.
3. Troncal z=-3.05, y=0.55 en coordenadas locales Y-up. Cocina al oeste,
   calefon al este. Living ocupa z positivo; NO tiene ramal V1.
4. Documentos antiguos hablan de tareas/periodos propuestos, no siempre del
   codigo actual. Para V2 prevalecen codigo y mediciones identificadas.
5. La fuente periodica puede omitir CRITICAL transitorio; el primer evento
   timing de la demo LIVE V1 fue rechazado por duplicacion de campo serial.
   V2 debe serializar diagnosticos desde un solo escritor.

V1: 25/25 PASS, WORT22346us, deadline500000us, commit medido679b489.
No hay transferencia de ese resultado a V2.
