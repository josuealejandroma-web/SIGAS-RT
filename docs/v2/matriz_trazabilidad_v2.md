# Trazabilidad V2

Estado de todas las evidencias V2: PENDIENTE. Esta matriz no certifica cobertura.

| Observacion | Requisitos | Diseno/codigo previsto | Prueba/evidencia | Documento |
| --- | --- | --- | --- | --- |
| Tipo/dato sensor | FR01/02 | Tipos y conversion central | Contrato ADC/I2C | sensores_y_variables |
| Presion valvula | FR03 | Mapping P0/P1/PK/PT/PL | Delta y N/A | presiones_y_valvulas |
| Tiempo/espera/periodo | RT01..05 | Tareas/instrumentacion | Nueva campana25 | tareas_freertos/analisis_temporal |
| Cantidad/ubicacion | FR01/09 | GS1/2/3 y5presiones | Plano y Blender | ubicacion_sensores |
| Tuberia living | FR05/09 | Nuevo ramal de ensayo | Auditoria geometrica | distribucion_tuberias |
| Rotura living | FR05/06,SR07 | Clasificador+fusion | CasosA..F | escenarios_v2 |
| Valvulas estrategicas | FR03/04,SR02 | VM antes de manifold | Aislamiento+escalamiento | arquitectura_v2 |
| Rearme/fallos | SR01..06 | Secuencias y enclavamiento | Host+fault injection | requisitos_v2 |
| Presentacion | FR07/08 | Schema2/bridge/Blender | Selftest+demo real | arquitectura_v2 |
| V1 preservada | SR08 | Archivos/entornos separados | Diff/hashes base | auditoria_base |

Los prefijos abreviados FR/SR/RT corresponden a V2-FR/V2-SR/V2-RT.
Actualizar a rutas y IDs de tests reales al implementar; no marcar PASS por
existencia de un archivo o por compilacion sin prueba funcional.
