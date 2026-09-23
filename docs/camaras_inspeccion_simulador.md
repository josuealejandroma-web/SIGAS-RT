# Cámaras de inspección del simulador

Corrección: 23 de septiembre de 2026.

## Problema

El selector de cámara solo actualizaba la posición, mientras la visibilidad
de techo y paredes dependía de la pestaña activa. Al elegir VISTA_SUPERIOR,
XRAY o una cámara de habitación desde CASA, la casa seguía cerrada. Desde
arriba se veía el techo y desde las habitaciones se veían paredes.

## Comportamiento corregido

| Selección | Resultado |
| --- | --- |
| VISTA_SUPERIOR o XRAY | Activa XRAY y coloca la cámara correspondiente. |
| COCINA, LIVING, AREA_TECNICA o MANIFOLD_MEDIDOR desde CASA | Activa XRAY y enfoca la zona sin paredes ni techo que la oculten. |
| Cámara de zona desde PRESIÓN, SEGURIDAD o TUBERÍAS | Conserva esa vista de inspección y cambia el encuadre. |
| EXTERIOR en el selector | Restaura CASA y la cámara exterior. |
| Pestaña CASA | Restaura la cámara EXTERIOR para evitar quedar dentro de la casa cerrada. |
| Pestaña de inspección desde EXTERIOR | Utiliza el encuadre general XRAY. |

La selección de cámara y la vista se actualizan juntas en el estado de la
interfaz. XRAY oculta la envolvente y muestra el resto de la casa con opacidad
0.3; TUBERÍAS conserva su opacidad 0.15. Las tuberías e instrumentos V2
permanecen opacos para poder inspeccionarlos. La rueda acerca/aleja del punto
de interés y arrastrar gira alrededor de él; no es navegación a pie.

## Verificación

- Prueba visual de VISTA_SUPERIOR y XRAY seleccionadas desde CASA.
- Prueba visual de COCINA, LIVING y AREA_TECNICA seleccionadas desde CASA.
- Giro y zoom comprobados en el área técnica sin bloqueo por paredes.
- 71 pruebas aprobadas, incluidas 13 nuevas de selección de cámara y pestaña,
  restauración del exterior y conservación de la vista de presión.
- TypeScript y compilación Vite correctos; sin errores de consola observados.

Los cambios son de visualización. La selección de cámara no inicia un escenario
ni modifica telemetría, válvulas o lógica de control.
