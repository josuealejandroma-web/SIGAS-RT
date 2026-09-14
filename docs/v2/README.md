# SIGAS-RT V2: desarrollo separado

Prototipo academico simulado, NO equipo certificado ni proyecto de instalacion.
Base: `435db425a64cb039c8d0264c38db36b35f4283ec` (Blender LIVE V1).
Rama: `feature/sigas-v2-pressure-zonal`.

## Estado

Diseno inicial en desarrollo. No existe aun validacion funcional o temporal V2.
Ninguna tabla de este directorio transforma resultados V1 en evidencia V2.
Los criterios siguientes son compromisos de diseno a verificar, no resultados.

## Documentos

- [Auditoria de base](auditoria_base.md)
- [Requisitos](requisitos_v2.md)
- [Arquitectura](arquitectura_v2.md)
- [Sensores y variables](sensores_y_variables.md)
- [Presiones y valvulas](presiones_y_valvulas.md)
- [Tuberias](distribucion_tuberias.md)
- [Ubicacion de sensores](ubicacion_sensores.md)
- [FreeRTOS](tareas_freertos_v2.md)
- [Analisis temporal](analisis_temporal_v2.md)
- [Escenarios](escenarios_v2.md)
- [Trazabilidad](matriz_trazabilidad_v2.md)
- [Limitaciones](limitaciones_v2.md)
- [Fuentes](fuentes_normativas.md)

V1 permanece recuperable desde el commit base y sus entornos PlatformIO.
`simulation/results/` no se modifica. Las futuras mediciones V2 se almacenan
en `simulation/results_v2/` con commit, hashes y escenario propios.
