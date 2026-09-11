# Matriz de trazabilidad SIGAS-RT

## Estados de evidencia

| Estado | Significado |
| --- | --- |
| `PASS LOCAL` | Verificado sobre el arbol actual sin ejecutar Wokwi. |
| `PASS HISTORICO WOKWI` | Evidencia conservada de la campana Wokwi anterior; no declara vigente el arbol actual. |
| `PENDIENTE REGRESION WOKWI FINAL` | Debe ejecutarse en la siguiente fase para cerrar evidencia temporal vigente. |

## Firmware y tiempo real

| Requisito / hallazgo | Diseno | Implementacion | Prueba | Evidencia / resultado |
| --- | --- | --- | --- | --- |
| RT-01, RT-02, RT-04, RT-05, RT-06: periodicidad y prioridades | `docs/tareas_freertos.md` | `src/sensors.cpp`, `src/safety.cpp`, `src/actuators.cpp`, `src/diagnostics.cpp` | Builds PlatformIO y revision de configuracion | `PASS LOCAL` |
| RS-10, RS-11: startup fail-safe | `docs/logica_critica.md` y `docs/arquitectura_sistema.md` | `BootGuard`, `SYSTEM_STARTUP` y timeout inicial | SAFE-BOOT-01, SAFE-BOOT-02, IT-01, CL-11 | `PASS LOCAL`; `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| RF-11, RF-12, RF-13, RS-03: enclavamiento, FAULT y rearme | `docs/logica_critica.md` | `SafetyCore` mantiene cierre y exige secuencia segura, liberacion y pulsacion estable | SAFE-FAULT-01 a SAFE-FAULT-04; CL-06 a CL-08 | `PASS LOCAL`; `PASS HISTORICO WOKWI` |
| RS-09: sensor timeout | Timeout de 350000 us y cierre fail-safe | `SafetyCore::handleSensorTimeout()` y `SAFE_CLOSE` | SAFE-FAULT-01 a SAFE-FAULT-04; CL-10 | `PASS LOCAL`; `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| RS-09, M02: stale sample | Edad monotona validada antes de clasificar o alimentar rearme | Validacion de `sampleTimestampUs` en `SafetyCore` | M02-04 a M02-06 | `PASS LOCAL` |
| RF-06, M02: continuidad de `sequence` | Solo `previous + 1` confirma; rollover `uint32_t` es continuo | Reinicio de ambos candidatos ante salto | M02-01 a M02-03 y M02-07 | `PASS LOCAL` |
| RF-05, M01: histeresis | Entrada WARNING en 1400 y salida bajo 1000; HIGH conserva memoria elevada | `classifyZone()` y estado por zona | M01-01 a M01-05; CL-02, CL-03 | `PASS LOCAL`; `PASS HISTORICO WOKWI` |
| RF-07 a RF-10, RS-04, M03: politica de actuadores | Una politica coherente para valvula, buzzer y LEDs | `ActuatorPolicy`, `buildActuatorCommand()` y `TaskActuator` | M03-01 a M03-04; CL-05, CL-09 | `PASS LOCAL`; `PASS HISTORICO WOKWI` |
| RF-15, RT-07, A05: timestamps | Fuente monotona y eventos separados para primera alta, confirmacion, comando, recepcion y aplicacion | `esp_timer_get_time()` y campos `TimingRecord` | A05-01 a A05-03; tests de parser y summary | `PASS LOCAL`; `PASS HISTORICO WOKWI` |
| RT-03: confirmacion a recepcion <= 500000 us | `docs/analisis_temporal.md` define `T_ACTUATOR_RECEIVED - T_CRITICAL_CONFIRMED` | Instrumentacion en `TaskSafety` y `TaskActuator` | TT-01 a TT-06 | Campana anterior: WORT 22504 us en 25 corridas, `PASS HISTORICO WOKWI`. Arbol actual: `PENDIENTE REGRESION WOKWI FINAL`. |
| A04: seleccion de artefactos | BIN, BIN combinado y ELF deben pertenecer al mismo environment | `visualization/bridge/firmware_artifacts.py` y manifest | Tests `test_firmware_artifacts.py`; `verify_artifact_selection.py` | `PASS LOCAL` |
| M05: summary temporal determinista | Summary derivado de `wcet_observed.csv` sin editar evidencia fuente | `simulation/generate_wcet_summary.py` | `test_generate_wcet_summary.py` y `--check` | `PASS LOCAL`; los CSV fuente siguen historicos |

## Telemetria, bridge y gemelo digital

| Requisito / hallazgo | Diseno | Implementacion | Prueba | Evidencia / resultado |
| --- | --- | --- | --- | --- |
| A01, A02: telemetria valida y adversa | Contrato JSON SIGAS con tipos y timestamps obligatorios | Parser Python y validacion de esquema en Godot | `test_parser.py`, `test_bridge_resilience.py`, `TelemetrySelfTest.gd` | `PASS LOCAL` |
| A01: `STALE` / `DISCONNECTED` | Reloj monotono; 1500 ms y 3000 ms sin reclasificar `SystemState` | `TelemetryReceiver.gd` y `Main.gd` | A01-03 a A01-06 | `PASS LOCAL` |
| A03: recorded replay | Captura historica identificada por ruta y SHA-256 | Loader de `wokwi_recorded_replay.jsonl` | A03-02, A03-03 y `TelemetrySelfTest.gd` | `PASS LOCAL`; fuente rotulada `RECORDED REPLAY` |
| A03: synthetic demo | Secuencia manual separada de la evidencia grabada | Playback local en `Main.gd` | A03-01, FREE-14 y FREE-14-PAUSE | `PASS LOCAL`; fuente rotulada `SYNTHETIC DEMO` |
| M04: ciclo de vida del bridge | Worker unico, reemplazo controlado y cierre acotado | `Bridge` y runner local | M04-01 a M04-08 con procesos y sockets falsos | `PASS LOCAL` |
| M07: free walk y accesos 1 a 9 | Capsula fisica, colliders locales, portales y pisos por nivel | `NavigationCollisionBuilder.gd`, `FreeWalkController.gd`, `PresentationController.gd` | FREE-01 a FREE-17 y `M07-QUICK-*-CLEAR/FLOOR/EXIT` | `PASS LOCAL`; acceso 6 libre de mesa y sillas |
| M06: Blender camera tour | 15 ambientes, 529 frames, 24 FPS y camara de presentacion separada del GLB | `create_camera_tour.py` y `sigas_house.blend` | `validate_scene.py` recorre frames 1 a 529 y reporta 143 a 145 | `PASS LOCAL`; 22.04 s y 15 marcadores |
| RS-07, B01: secretos fuera del repositorio | Credenciales solo por entorno; archivos Git textuales y relevantes | `scripts/secret_scan.ps1` | `scripts/test_secret_scan.ps1` verifica deteccion y redaccion | `PASS LOCAL`; nunca imprime el contenido detectado |

## Escenarios Wokwi

| Caso | Proposito | Evidencia disponible | Estado actual |
| --- | --- | --- | --- |
| CL-01 a CL-11 | Logica critica, startup, enclavamiento, rearme y timeout | Logs y resultados de la campana anterior | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-01 | Zona 1 critica sostenida | `simulation/timing_test.yaml` y CSV historicos | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-02 | Zona 2 critica sostenida | `simulation/timing_zone2_test.yaml` y CSV historicos | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-03 | Ambas zonas criticas | `simulation/timing_both_test.yaml` y CSV historicos | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-04 | Diagnostico bajo carga | `simulation/timing_load_test.yaml` y CSV historicos | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-05 | Evento desplazado respecto al muestreo | `simulation/timing_phase_test.yaml` y CSV historicos | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |
| TT-06 | Campana repetida normal y con carga | `simulation/run_timing_measurements.ps1`; 25 corridas historicas | `PASS HISTORICO WOKWI`; `PENDIENTE REGRESION WOKWI FINAL` |

La fase actual no ejecuta Wokwi, no reemplaza resultados temporales historicos y
no modifica la arquitectura critica. El cierre temporal vigente depende
exclusivamente de la regresion Wokwi final.
