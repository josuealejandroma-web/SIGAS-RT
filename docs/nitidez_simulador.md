# Nitidez de las vistas del simulador

Corrección local del 23 de septiembre de 2026.

## Causa y cambio

El canvas 3D conservaba su resolución inicial de 300 x 150 píxeles.
`resizeCanvas` ajustaba su tamaño visible, pero PlayCanvas utiliza
`RESOLUTION_FIXED` por defecto y no redimensionaba el búfer de dibujo.
La imagen pequeña se estiraba sobre el panel, causando desenfoque y una
proporción incorrecta en CASA, XRAY, TUBERÍAS, PRESIÓN y SEGURIDAD.

`Scene3D.tsx` configura ahora `RESOLUTION_AUTO`, que adapta la resolución
real al tamaño visible y a la densidad de píxeles de la pantalla. La cámara
usa así la proporción correcta. El ResizeObserver existente conserva la
adaptación cuando cambia el tamaño del panel.

Los modos limitan la densidad máxima: LOW a 1, MEDIUM a 1.5, AUTO a 2 y
HIGH a 3. PlayCanvas utiliza el menor valor entre ese límite y la densidad
real del dispositivo. HIGH no inventa detalle ni amplía por encima de la
densidad de la pantalla. LOW desactiva las sombras. Cambiar la calidad
actualiza la resolución sin reiniciar la posición de cámara.

En `App.css`, las etiquetas pasan de 10 a 12 px y la escena en ventanas
estrechas tiene un mínimo de 420 px de alto para facilitar la inspección.

## Comprobación

- Antes: 300 x 150 píxeles de dibujo sobre un panel de 754 x 300.
- Después, con densidad 1.25: 942 x 375; con el nuevo panel de 754 x 420,
  942 x 525. LOW produce 754 x 420.
- Verificadas visualmente las cinco vistas, sin errores de consola observados.
- Verificada la adaptación a un panel de escritorio de 920 x 643 con densidad 1.
- TypeScript y compilación Vite correctos. Permanecen las advertencias previas
  de tamaño del paquete PlayCanvas y externalización de worker_threads.

La corrección afecta exclusivamente a la visualización local; no cambia
los datos, escenarios, firmware ni la lógica de detección y control.
