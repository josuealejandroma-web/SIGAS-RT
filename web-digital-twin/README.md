# Gemelo digital web SIGAS-RT

Visualización auxiliar React, TypeScript y PlayCanvas. La lógica crítica permanece en Sensor → ADC → CPU → Procesamiento en tiempo real → Actuador.

## Inicio rápido

Requiere Node.js 22.23.2 o posterior, npm y un navegador WebGL2/WebGPU. Desde esta carpeta:

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --strictPort
```

Abre http://127.0.0.1:5173/. Conserva la terminal abierta; Ctrl+C termina la web. La demo predeterminada MOCK_SIM es sintética y no requiere Python, MATLAB, Wokwi ni Blender. Si utilizaste MATLAB en esta terminal, elimina VITE_FORCE_SOURCE y VITE_WS_URL antes de iniciar.

## Integración MATLAB

Instala dependencias web, MATLAB R2026a y los productos/licencias de la [guía completa](../docs/instalacion_otro_dispositivo.md). Desde la raíz del repositorio:

```powershell
$env:MATLAB_EXE = 'C:\Program Files\MATLAB\R2026a\bin\win64\MATLAB.exe'
powershell -ExecutionPolicy Bypass -File scripts\run_matlab_web_twin.ps1 -Scenario V2_NORMAL -StopTime 8 -PlaybackRate 1
```

El lanzador mantiene una sesión MATLAB y puente local UDP 45810 / WebSocket 45811. La web usa 5173. Los botones solicitan escenarios predefinidos; MATLAB calcula y reproduce la telemetría. SIMULACIÓN FINALIZADA conserva el resultado y permite otra prueba. No hay órdenes directas a actuadores críticos.

## Uso

- CASA muestra el exterior; XRAY permite inspeccionar el interior.
- TUBERÍAS, PRESIÓN y SEGURIDAD muestran sus variables.
- Cámara selecciona exterior, cocina, living, área técnica, colector/medidor, superior o XRAY.
- Arrastra para girar y usa la rueda para acercar. Pulsa etiquetas para detalles.
- El panel lateral mantiene escenarios, datos, gráficos y cronología; en demo local hay controles de reproducción.
- Rendimiento ofrece AUTOMÁTICO, BAJO, MEDIO y ALTO.

Consulta el [manual del simulador](../docs/manual_simulador.md). MATLAB y la demo sintética no garantizan clasificaciones idénticas; revisa las limitaciones mostradas.

## Verificación

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

`npm.cmd run start` sirve la compilación previa; para MATLAB usa el lanzador en 5173. Lint y formateo son herramientas de desarrollo, no requisitos de ejecución.

## Estructura

| Carpeta | Función |
| --- | --- |
| src/scene | Escena, cámaras y topología |
| src/ui | Paneles y controles |
| src/state | Estado visual |
| src/scenarios | Demo sintética |
| src/telemetry | Tipos y validación |
| src/bridge/server.ts | Puente MATLAB local |
| public/models | Casa versionada |
| tests | Pruebas automatizadas |

Usa npm ci con package-lock.json. No se versionan node_modules, entornos personales ni compilaciones. Para clonación, requisitos, firmware, MATLAB y problemas frecuentes sigue la [guía para otro equipo](../docs/instalacion_otro_dispositivo.md).
