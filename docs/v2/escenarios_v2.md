# Especificacion de escenarios V2

Estado: especificacion; ejecucion pendiente. Inicial todos: gas bajo, sensores
validos/frescos, P0/P1=20mbar y PK/PT/PL=19mbar (SIMULATION_ONLY).

| Escenario | Estimulo | Resultado requerido |
| --- | --- | --- |
| V2_NORMAL | Inicial estable | NORMAL,4OPEN despues boot seguro |
| V2_GAS_LEAK_KITCHEN | GS1 alto3muestras | GAS_LEAK Z1,VK CLOSED,latched |
| V2_GAS_LEAK_TECHNICAL | GS2 alto | GAS_LEAK Z2,VT CLOSED |
| V2_GAS_LEAK_LIVING | GS3 alto | GAS_LEAK Z3,VL CLOSED |
| V2_PIPE_RUPTURE_LIVING | PL cae,persiste,luegoGS3alto | PIPE_RUPTURE Z3,VL; perdidaP1 posterior escalaVM |
| V2_PRESSURE_DROP_NO_GAS | PL bajo persistente | ANOMALY, no rotura; escalamiento conservador si persiste |
| V2_PRESSURE_SENSOR_FAILURE | PL NACK/stale/rango | FAULT,VM CLOSED,no rearme con datos invalidos |
| V2_GAS_SENSOR_FAILURE_Z3 | AdquisicionGS3 detenida | FAULT,VM CLOSED |
| V2_MULTI_ZONE_LEAK | GS1/GS3 altos | MULTI_ZONE,VM CLOSED |
| V2_MASTER_PRESSURE_LOSS | P0 y todos bajan uniformemente | SUPPLY_LOSS,no PIPE_RUPTURE,VM CLOSED |
| V2_FALSE_PRESSURE_SPIKE | PL cae una muestra y vuelve | No latched; candidate descartado |
| V2_FULL_DEMO | Normal,leak,rearme,rupture,rearme,loss,fault,multi | Secuencia y valvulas verificadas sin inventar telemetria |

Por cierre confirmado se exige timing completo y RT academico; un escenario
sin cierre no debe inventar timing PASS. Agregar fault tests de cola llena,
gaps, rollover, timestamp futuro, duplicado, varios sensores perdidos y stuck.
Stuck plausible sin diagnostico no se afirma detectable por mero ADC constante.
