# Validación de instalación — 26 de septiembre de 2026

Se copió el proyecto web a una carpeta local de comprobación, sin `node_modules` ni `dist`, y se ejecutó `npm ci` usando el `package-lock.json` versionado. Se comprobó así una instalación nueva de dependencias, sin reutilizar las instaladas en la carpeta de desarrollo.

| Comprobación | Resultado |
| --- | --- |
| Instalación npm ci | Correcta: 613 paquetes instalados |
| TypeScript | Correcto |
| Vitest | 71 pruebas aprobadas en 6 archivos |
| Compilación Vite | Correcta |
| Enlaces locales de README y guía de instalación | Correctos |
| Escaneo de secretos | Correcto |

Vite emitió advertencias de tamaño de archivos y compatibilidad de workers de PlayCanvas, sin impedir la compilación. La instalación emitió advertencias de dependencias y scripts de instalación; las comprobaciones posteriores finalizaron correctamente.

La distribución de las vistas antes de Cámara y la ausencia de desbordamientos del panel lateral se verificaron previamente en el navegador, incluyendo un ancho de 1483 píxeles. La demo web no requiere herramientas MATLAB, firmware ni visualizadores alternativos.

Esta comprobación cubre la instalación y construcción web. No se volvió a ejecutar MATLAB, Wokwi, Godot, Blender ni una compilación del firmware para esta entrega documental. Sus requisitos y comandos se documentan en la [guía desde cero](instalacion_otro_dispositivo.md), y su evidencia histórica permanece en los documentos correspondientes. Una licencia MATLAB válida y los productos necesarios deben verificarse en cada equipo.
