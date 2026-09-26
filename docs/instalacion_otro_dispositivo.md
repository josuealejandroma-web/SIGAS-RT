# Instalación desde cero de SIGAS-RT

Guía para un usuario externo en Windows 10/11 y PowerShell. La demo web solo requiere Git, Node.js y un navegador. MATLAB, Python, PlatformIO, Wokwi, Godot y Blender se instalan según la capa que se quiera utilizar.

## 1. Requisitos por modalidad

| Modalidad | Herramientas | Fuente de datos |
| --- | --- | --- |
| Casa 3D y escenarios locales | Git, Node.js 22.23.2 o posterior con npm, navegador WebGL2/WebGPU | MOCK_SIM, sintética |
| Modelo físico integrado | Lo anterior y MATLAB R2026a con Simulink, Simscape, Stateflow y Simscape Fluids, con licencia válida | MATLAB_SIM |
| Firmware ESP32 | Git, Python 3.11 o posterior y PlatformIO | Control embebido |
| Simulación firmware | Firmware compilado y Wokwi | ESP32/FreeRTOS simulado |
| Visualizadores alternativos | Godot o Blender | Telemetría auxiliar |

Instala Git desde https://git-scm.com/downloads, Node.js desde https://nodejs.org/en/download y Python, cuando corresponda, desde https://www.python.org/downloads/. Reabre PowerShell después de instalar. MATLAB se instala desde MathWorks con sus productos y licencias; otras versiones no se dan por verificadas.

La arquitectura crítica sigue Sensor → ADC → CPU → Procesamiento en tiempo real → Actuador. Internet es necesario para descargar herramientas y dependencias; el control embebido no depende de Internet.

## 2. Clonar main

Comprueba las herramientas y clona en la carpeta donde quieras guardar el proyecto:

```powershell
git --version
node --version
npm.cmd --version
git clone --branch main https://github.com/josuealejandroma-web/SIGAS-RT.git
cd SIGAS-RT
git status
```

Se usa `npm.cmd` para evitar el bloqueo de `npm.ps1` por PowerShell. No cambies permanentemente la política de ejecución. No copies `.venv`, `node_modules`, `.pio`, `tools` ni cachés MATLAB de otro equipo. Los modelos de la casa están incluidos en `web-digital-twin/public/models`; Blender no es necesario para mostrarlos.

## 3. Dependencias y verificación web

Desde la raíz del clon:

```powershell
cd web-digital-twin
npm.cmd ci
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

`npm ci` instala las versiones de `package-lock.json`. TypeScript, pruebas y compilación deben finalizar correctamente. Las advertencias de tamaño de archivos PlayCanvas no equivalen a un fallo. La cantidad de pruebas puede cambiar entre revisiones.

## 4. Ejecutar sin MATLAB

En `web-digital-twin`:

```powershell
Remove-Item Env:VITE_FORCE_SOURCE -ErrorAction SilentlyContinue
Remove-Item Env:VITE_WS_URL -ErrorAction SilentlyContinue
npm.cmd run dev -- --host 127.0.0.1 --strictPort
```

Abre http://127.0.0.1:5173/ y deja la terminal abierta. Debes ver la casa, las vistas antes de «Cámara», la fuente SIMULACIÓN LOCAL y escenarios habilitados. `Ctrl+C` cierra la web.

Prueba inicial:

1. Pulsa NORMAL: estado normal y válvulas abiertas.
2. Pulsa XRAY y selecciona VISTA_SUPERIOR: tuberías internas visibles.
3. Pulsa FUGA COCINA y espera advertencia, crítico y cierre de VK en la demo.
4. Pulsa SEGURIDAD y revisa sensores e indicadores.
5. Pulsa NORMAL para otra prueba y CASA para volver al exterior.

Esto verifica la demo sintética, no MATLAB ni el firmware. Consulta el [manual del simulador](manual_simulador.md).

## 5. Preparar MATLAB (opcional)

Desde la raíz `SIGAS-RT`, configura la ruta real de TU instalación en la terminal actual:

```powershell
$env:MATLAB_EXE = 'C:\Program Files\MATLAB\R2026a\bin\win64\MATLAB.exe'
Test-Path -LiteralPath $env:MATLAB_EXE
& $env:MATLAB_EXE -batch "disp(version); ver"
& $env:MATLAB_EXE -batch "addpath(fullfile(pwd,'matlab','scripts')); p=setup_project(); disp(p.RootFolder)"
& $env:MATLAB_EXE -batch "addpath(fullfile(pwd,'matlab','scripts')); setup_project(); [out,ds]=run_scenario('V2_NORMAL',1); assert(~isempty(out.yout)); disp('MATLAB_SIM_OK')"
```

`Test-Path` debe devolver True. Revisa que `ver` incluya todos los productos del paso 1. La primera carga puede tardar. Estas variables afectan solo la terminal actual; no hay que copiar rutas personales de otro usuario.

## 6. Ejecutar MATLAB y web

Cierra la demo web con Ctrl+C. En la raíz y en la terminal donde definiste MATLAB_EXE:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_matlab_web_twin.ps1 -Scenario V2_NORMAL -StopTime 8 -PlaybackRate 1
```

El lanzador requiere haber instalado dependencias web previamente. Inicia Vite en 5173, WebSocket en 45811 y UDP en 45810, todos locales. Inicia MATLAB una vez y mantiene la sesión. `StopTime` admite 1 a 60 segundos y `PlaybackRate` 0.1 a 4; la demostración completa usa 40 segundos.

Espera CONECTADO. MATLAB calcula y luego reproduce telemetría. SIMULACIÓN FINALIZADA conserva el resultado y deja la sesión abierta para otro escenario. Durante cálculo o reproducción espera a que termine. Los botones solicitan escenarios predefinidos; no envían órdenes directas a actuadores críticos. Los estados de válvulas y alarmas provienen del modelo. MATLAB_SIM identifica la fuente, no garantiza muestras continuamente recientes.

Al terminar, espera la finalización, pulsa Cerrar sesión MATLAB y usa Ctrl+C en el lanzador para cerrar web y puente. Mantén la terminal abierta durante el uso. Los archivos de diagnóstico se crean en `tools/web-matlab-<PID>/matlab.log`; el PID cambia por sesión.

## 7. Compilar firmware (opcional)

Desde la raíz, con Python instalado:

```powershell
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1 -SkipWokwi -SkipGodot -SkipBlender
```

Si no existe `py`, usa `python -m venv .venv` con tu Python instalado. No es necesario activar el entorno virtual. PlatformIO descarga plataforma y bibliotecas en la primera compilación. La validación indicada omite herramientas opcionales no instaladas; no sustituye las pruebas web.

## 8. Wokwi, Godot y Blender (opcionales)

El circuito está en `simulation/diagram.json` y la configuración en `simulation/wokwi.toml`. Tras compilar ambos entornos, prepara y comprueba los artefactos:

```powershell
.\.venv\Scripts\python.exe scripts\verify_artifact_selection.py
```

Wokwi usa `.pio/wokwi/current/firmware-merged.bin` y `firmware.elf`. No copies binarios históricos como si fueran los actuales. Sigue [circuito Wokwi](circuito_wokwi.md) y [entorno de desarrollo](entorno_desarrollo.md). La CLI necesita WOKWI_CLI_TOKEN configurado privadamente en el entorno; nunca guardes tokens en Git.

Los flujos alternativos están en [visualización](../visualization/README.md), [Blender](../visualization/blender/README.md) y [puente del firmware](../visualization/bridge/README.md). Son distintos del puente MATLAB de la web. No hacen falta para ejecutar la demo web.

## 9. Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| Herramienta no reconocida | Reabre PowerShell y comprueba versiones y PATH. |
| npm.ps1 bloqueado | Ejecuta npm.cmd. |
| npm ci falla por Node | Instala una versión que cumpla el mínimo declarado y reintenta. |
| Dependencias incompletas | Cierra Vite y ejecuta npm.cmd ci; conserva package-lock.json. |
| Puerto ocupado | Cierra el lanzador anterior con Ctrl+C; no termines procesos desconocidos. |
| MATLAB no encontrado | Define MATLAB_EXE en la misma terminal del lanzador y verifica Test-Path. |
| Falta biblioteca MATLAB | Comprueba productos con ver y sus licencias. |
| MATLAB presenta error | Revisa mensaje de interfaz y tools/web-matlab-<PID>/matlab.log. |
| Casa ausente | Comprueba public/models, recarga y usa aceleración gráfica y WebGL2/WebGPU. |
| Renderizado lento | Selecciona BAJO o MEDIO. |
| Resultado estático al finalizar | Es el último resultado conservado; ejecuta otro escenario. |
| Demo local muestra MATLAB | Elimina VITE_FORCE_SOURCE y VITE_WS_URL y reinicia Vite. |

Identifica puertos sin finalizar procesos:

```powershell
Get-NetTCPConnection -LocalPort 5173,45811 -ErrorAction SilentlyContinue
Get-NetUDPEndpoint -LocalPort 45810 -ErrorAction SilentlyContinue
```

La integración MATLAB debe usar 5173 porque el puente valida ese origen. No expongas el puente a Internet. No utilices otro puerto para eludir una sesión anterior.

## 10. Actualizar y validar

Con los procesos cerrados y los cambios propios conservados, desde la raíz:

```powershell
git pull --ff-only origin main
cd web-digital-twin
npm.cmd ci
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Comprueba casa visible, XRAY con tuberías, escenarios, tarjetas legibles y fuente correcta. Para MATLAB añade una ejecución conectada y completada. Consulta [índice de documentación](README.md).

## 11. Límites

Demo sintética, MATLAB y Wokwi son fuentes distintas. La rotura puede clasificarse como fuga de gas en el modelo MATLAB actual; la interfaz muestra la limitación. Los ADC, tiempos simulados y modelos visuales no certifican una instalación real. Consulta [limitaciones V2](v2/limitaciones_v2.md) y [validación MATLAB](v2/matlab_validation_checkpoint.md).
