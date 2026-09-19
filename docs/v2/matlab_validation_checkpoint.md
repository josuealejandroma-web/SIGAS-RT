# Checkpoint de validacion MATLAB V2

Fecha: 2026-09-19. Rama: `feature/matlab-simulink-migration`.

## Estado del entorno

- MATLAB R2026a Update 5 compartido mediante MCP local.
- Modelos `SIGAS_RT_System`, `SIGAS_Controller`, `SIGAS_SensorModel`,
  `SIGAS_GasNetwork` y `SIGAS_Telemetry` compilados.
- La red Simscape usa cargas terminales parametrizadas; los extremos de las
  tres ramas ya no estan conectados directamente al ambiente.
- `Pipe_TerminalLoadArea = 1e-7 m^2` y
  `Pipe_LeakAreaRupture = 4e-5 m^2` son supuestos de simulacion, no datos de
  una instalacion certificada.

## Evidencia dinamica confirmada

| Escenario | Resultado observado | Estado |
| --- | --- | --- |
| `V2_NORMAL` | NORMAL; 4 valvulas abiertas; presiones finales `[20, 19.9722, 19.9677, 19.9677, 19.9656]` mbar | PASS |
| `V2_GAS_LEAK_KITCHEN` | GAS_LEAK; mascara Z1; VK cerrada; enclavamiento a 2.75 s | PASS |
| `V2_MULTI_ZONE_LEAK` | MULTI_ZONE; mascara 7; VM/VK/VT/VL cerradas; enclavamiento a 2.75 s | PASS |
| `V2_PIPE_RUPTURE_LIVING` | P1 permanece sobre 12 mbar y PL cae bajo 12 mbar, pero el diferencial P1-PL previo al cierre permanece bajo 4 mbar; se clasifica GAS_LEAK o PRESSURE_ANOMALY segun la secuencia | FAIL conocido |

Los tiempos anteriores son tiempos de simulacion MATLAB. No son WCET ni WCRT
del ESP32 y no reemplazan la evidencia temporal V1.

## Diagnostico pendiente

El criterio Stateflow para PIPE_RUPTURE exige simultaneamente P1 >= 12 mbar,
PL < 12 mbar, P1-PL >= 4 mbar, caudal living positivo y GS3 alto durante la
confirmacion. Con la topologia y parametros actuales no se observo una ventana
simultanea valida antes del cierre de VL. No se redujo el umbral para forzar un
PASS.

Siguiente accion recomendada: revisar la parametrizacion fisica de la rama
living (perdidas distribuidas, ubicacion de P1/PL y carga terminal) y contrastar
el criterio con `docs/v2/presiones_y_valvulas.md` antes de modificar Stateflow.

## Advertencias no bloqueantes

- Simulink informa overrides internos de enlaces de biblioteca en conversores
  Simscape durante autolayout.
- No esta registrada la toolchain `Microsoft Visual C++ 2026 (C)`; la
  simulacion normal funciona, pero la generacion de codigo no queda validada.
