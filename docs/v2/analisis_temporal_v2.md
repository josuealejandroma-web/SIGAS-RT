# Analisis temporal V2

Estado: NO MEDIDO. No hay PASS V2 ni estimacion presentada como medicion.
V1(25/25,22346us) no valida nuevos sensores, I2C, fusion ni cuatro actuadores.

Deadline post-confirmacion:500000us, ACADEMIC DESIGN REQUIREMENT, no ANH.
Registrar por evento y zona: pressure anomaly first/confirmed, gas high
first/confirmed, safety decision, command sent, actuator received/applied.

| Metrica | Diferencia |
| --- | --- |
| Confirmacion presion | T_PRESSURE_CONFIRMED - T_PRESSURE_ANOMALY_FIRST |
| Confirmacion gas | T_GAS_CONFIRMED - T_GAS_HIGH_FIRST |
| Correlacion | decision menos ultima confirmacion necesaria |
| Envio | T_COMMAND_SENT - T_SAFETY_DECISION |
| Dispatch | T_ACTUATOR_RECEIVED - T_COMMAND_SENT |
| Apply software | T_ACTUATOR_APPLIED - T_ACTUATOR_RECEIVED |
| Respuesta postconfirmacion | T_ACTUATOR_RECEIVED - T_CONFIRMATION_TRIGGER |
| End-to-end observado | recibido menos primer estimulo observado relevante |

Campos no aplicables son null, no cero que simule una medicion.
Gas3x100ms -> ventana de confirmacion desde primera muestra~200ms; presion3x50
-> ~100ms. No se presenta como limite garantizado desde fuga fisica.

Puertas para medir: host+fallos PASS, builds3 PASS, Wokwi funcional PASS,
schema/bridge/Blender PASS, codigo comprometido limpio. Luego20 standard+5load
en results_v2 con commit medido, entorno, escenario, hashes BIN/ELF/chip,
timestamps causales, unidades, resultado y margen. Resumen recalculable desde
crudos; logs corruptos/incompletos invalidan corrida, nunca rellenar valores.

Resultados previstos: timing_runs_v2.csv, timing_summary_v2.csv,
observed_execution_time_v2.csv y manifest_v2.json. Aun NO generados.
No WCET/WCRT formal ni certificacion Hard Real-Time; apply software no es cierre
fisico. Excluir Blender del intervalo temporal del firmware.
