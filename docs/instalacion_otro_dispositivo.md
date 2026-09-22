# Instalacion de SIGAS-RT en otro dispositivo

Esta guia reproduce el repositorio desde un Windows 10/11 limpio. Todos los
servicios del gemelo digital se enlazan a `127.0.0.1`; la logica critica del
firmware no depende de Internet ni de la visualizacion.

## 1. Requisitos

Instalar y dejar disponibles en `PATH`:

- Git.
- Python 3.11 o posterior (`py` o `python`).
- Node.js 22.23.2 o posterior, con `npm`.
- MATLAB R2026a con Simulink, Simscape, Stateflow y Simscape Fluids.
- Opcionales segun el flujo: Godot 4, Blender 5, Wokwi CLI y Visual Studio Code.

Comprobar las herramientas:

```powershell
git --version
py --version
node --version
npm --version
matlab -batch "disp(version); ver"
```

El warning sobre una toolchain C/C++ no registrada no impide la simulacion
normal. Solo es obligatorio configurar un compilador compatible si se genera
codigo o se usa un modo acelerado que lo requiera.

## 2. Clonar `main`

```powershell
git clone https://github.com/josuealejandroma-web/SIGAS-RT.git
cd SIGAS-RT
git switch main
git pull --ff-only origin main
```

No copiar `.venv`, `node_modules`, `.pio`, `matlab/work`, `slprj` ni archivos
`*.slxc` desde otro equipo. Son artefactos locales y se regeneran.

## 3. Firmware y pruebas Python

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1 -SkipWokwi
```

Wokwi es opcional. Si se usa, guardar su token solo en la variable de entorno
`WOKWI_CLI_TOKEN`; nunca en el repositorio, `.env` o configuraciones MCP.

## 4. Web en modo autonomo

```powershell
cd web-digital-twin
npm ci
npm run typecheck
npm run test
npm run build
npm run dev
```

Abrir `http://127.0.0.1:5173/`. Sin `VITE_FORCE_SOURCE`, la web usa
`MOCK_SIM`; permite validar interfaz, escenarios y modelo 3D sin MATLAB.

Para acceder desde otro dispositivo de la misma LAN se puede ejecutar
`npm run dev:lan`, pero ese modo solo expone la interfaz. El bridge MATLAB se
mantiene deliberadamente en localhost y no debe exponerse a Internet.

## 5. MATLAB y proyecto Simulink

Desde la raiz del repositorio:

```powershell
matlab -batch "cd(pwd); addpath(fullfile(pwd,'matlab','scripts')); p=setup_project(); disp(p.RootFolder)"
```

Prueba corta del escenario normal:

```powershell
matlab -batch "cd(pwd); addpath(fullfile(pwd,'matlab','scripts')); setup_project(); [out,ds]=run_scenario('V2_NORMAL',1); assert(~isempty(out.yout)); disp('MATLAB_SIM_OK')"
```

No usar `restoredefaultpath` durante una sesion MCP de MATLAB porque elimina
las funciones del conector de la ruta activa.

## 6. Integracion MATLAB -> web

Cerrar cualquier servidor anterior que use los puertos indicados y ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_matlab_web_twin.ps1 `
  -Scenario V2_NORMAL -StopTime 30 -PlaybackRate 1
```

El script realiza estas operaciones:

1. instala dependencias web con `npm ci` si `node_modules` no existe;
2. inicia el bridge UDP `127.0.0.1:45810` -> WebSocket `127.0.0.1:45811`;
3. inicia Vite en `http://127.0.0.1:5173` con fuente `MATLAB_SIM`;
4. ejecuta el escenario con `Simulink.SimulationInput`;
5. reproduce las tramas respetando `PlaybackRate`;
6. mantiene bridge y web activos hasta que se pulse `Ctrl+C`.

La interfaz muestra `LIVE` durante la recepcion, `STALE` despues de 1.5 s sin
tramas y `DISCONNECTED` despues de 3 s. Esto no significa que MATLAB o la
licencia hayan fallado: significa que no existe telemetria reciente. Para una
demostracion mas larga, aumentar `StopTime` o reducir `PlaybackRate`, por
ejemplo `-StopTime 60 -PlaybackRate 0.5`.

El canal es de solo lectura. Todo mensaje del navegador hacia el bridge se
rechaza con `READ_ONLY`; la web no controla valvulas, buzzer ni LEDs.

## 7. Puertos ocupados

Comprobar quien usa los puertos:

```powershell
Get-NetTCPConnection -LocalPort 5173,45811 -ErrorAction SilentlyContinue
Get-NetUDPEndpoint -LocalPort 45810 -ErrorAction SilentlyContinue
```

No finalizar procesos desconocidos. Cerrar primero el launcher anterior con
`Ctrl+C`. El launcher solo detiene los procesos hijos que el mismo inicio.

## 8. Criterio de entrega saludable

En un clon limpio deben cumplirse, como minimo:

```powershell
cd web-digital-twin
npm ci
npm run typecheck
npm run test
npm run build
cd ..
git diff --check
```

Ademas, la prueba integrada debe mostrar una trama `MATLAB_SIM` valida y el
bridge debe rechazar cualquier mensaje ascendente como `READ_ONLY`.

Limitacion conocida del modelo fisico: el escenario
`V2_PIPE_RUPTURE_LIVING` todavia no alcanza el diferencial P1-PL de 4 mbar
antes del cierre y por eso su clasificacion V2 permanece documentada como
pendiente en `docs/v2/matlab_validation_checkpoint.md`.
