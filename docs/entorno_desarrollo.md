# Entorno de desarrollo SIGAS-RT

Fecha de auditoria: 2026-09-04
Sistema operativo: Windows
Directorio del proyecto: `C:\Users\josue\Proyectos\SIGAS-RT`

## Objetivo

Preparar una maquina de desarrollo para un proyecto academico de sistema embebido critico con ESP32, C/C++, FreeRTOS, PlatformIO, Wokwi, Git, GitHub, VS Code y Codex.

Esta etapa solo prepara infraestructura. No se implementa todavia detector de gas, sensores MQ, ADC definitivo, valvula ni logica de emergencia.

Arquitectura obligatoria:

```text
Sensor -> ADC -> CPU / Microcontrolador -> Procesamiento en tiempo real -> Actuador
```

## Estado del repositorio

El repositorio Git ya existe.

Commits recientes:

```text
ac91269 Crear estructura base del proyecto SIGAS-RT
c62d88a Agregar archivo gitignore
609c67e Preparacion inicial del proyecto SIGAS-RT
```

Remoto configurado:

```text
origin https://github.com/josuealejandroma-web/SIGAS-RT.git
```

Estructura existente:

```text
src/
include/
lib/
test/
docs/
simulation/
```

## Herramientas verificadas e instaladas

### Git

Comando:

```powershell
git --version
git config --global user.name
git config --global user.email
git remote -v
```

Resultado:

```text
git version 2.53.0.windows.2
user.name = Josue
user.email = josuealejandroma@gmail.com
origin = https://github.com/josuealejandroma-web/SIGAS-RT.git
```

Git esta instalado y configurado para commits.

### Visual Studio Code

Comando:

```powershell
code --version
code --list-extensions --show-versions
```

Resultado:

```text
VS Code 1.135.0
Commit 08d4889f9ec4a1685d257b9b95de036c8e1ce1e5
Arquitectura x64
```

VS Code esta instalado.

Extensiones embebidas esperadas:

| Extension | Estado | Proposito |
| --- | --- | --- |
| `platformio.platformio-ide@3.3.4` | Instalado | Gestion de proyectos PlatformIO, builds, upload, monitor serial y toolchains embebidos. |
| `ms-vscode.cpptools@1.33.8` | Instalado | IntelliSense, navegacion, depuracion y soporte C/C++. |
| `ms-vscode.vscode-serial-monitor@0.13.1` | Instalado | Monitor serial integrado para placas y simuladores. |
| `github.vscode-github-actions@0.32.3` | Instalado | Integracion con GitHub Actions. |
| `github.vscode-pull-request-github@0.164.0` | Instalado | Pull requests e issues de GitHub desde VS Code. |
| `wokwi.wokwi-vscode@3.7.0` | Instalado | Simulacion Wokwi desde VS Code. |

### Node.js

Comando:

```powershell
node --version
npm --version
npx --version
```

Resultado:

```text
node v24.13.0
npm 11.6.2
npx 11.6.2
```

Node.js esta instalado.

### Python

Comando:

```powershell
python --version
py --version
py -m pip --version
python -m pip --version
```

Resultado:

```text
Python 3.14.3
pip 25.3
```

Python esta instalado. El comando `pip` directo no esta disponible en `PATH`, pero `py -m pip` y `python -m pip` funcionan.

### PlatformIO

Comando:

```powershell
pio --version
platformio --version
python -m platformio --version
```

Resultado:

```text
pio: no reconocido
platformio: no reconocido
python -m platformio: No module named platformio
```

Resultado despues de preparar entorno local:

```powershell
.\.venv\Scripts\platformio --version
```

```text
PlatformIO Core, version 6.1.19
```

PlatformIO Core quedo instalado dentro de `.venv/` para evitar contaminar paquetes globales de Python.

Paquetes ESP32 instalados por PlatformIO durante la primera compilacion:

```text
platform = espressif32@7.1.0
board = esp32doit-devkit-v1
framework-arduinoespressif32 = 3.20017.241212+sha.dcc1105b
tool-esptoolpy = 2.41100.260830 / esptool.py 4.11.0
toolchain-xtensa-esp32 = 8.4.0+2021r2-patch5
```

### Arduino CLI

Comando:

```powershell
arduino-cli version
```

Resultado:

```text
arduino-cli: no reconocido
```

Resultado despues de instalar con `winget`:

```powershell
& 'C:\Program Files\Arduino CLI\arduino-cli.exe' version
& 'C:\Program Files\Arduino CLI\arduino-cli.exe' core list
```

```text
arduino-cli Version: 1.5.1 Commit: 01f3d4f2b Date: 2026-06-05T10:22:12Z
arduino:avr   1.8.6
arduino:esp32 2.0.18-arduino.5
```

Arduino CLI quedo instalado, pero el shell actual todavia no lo resuelve como `arduino-cli` en `PATH`. Funciona por ruta absoluta. Abrir una terminal nueva puede cargar el `PATH` actualizado por el instalador MSI.

### Wokwi CLI

Comando:

```powershell
wokwi-cli --version
wokwi --version
```

Resultado:

```text
wokwi-cli: no reconocido
wokwi: no reconocido
```

El script oficial de instalacion en PowerShell fallo por TLS:

```text
Authentication failed because the remote party sent a TLS alert: 'ProtocolVersion'.
```

Se instalo como binario local descargado desde GitHub Releases:

```text
tools/wokwi-cli.exe
```

Version validada:

```powershell
.\tools\wokwi-cli.exe --version
```

```text
0.26.1 (9d71b975b7eb)
```

## Gestores de paquetes disponibles

Comando:

```powershell
winget --version
choco --version
scoop --version
```

Resultado:

```text
winget v1.29.290
choco 2.5.1
scoop: no reconocido
```

`winget` y Chocolatey estan disponibles. No se detecto Scoop.

## Conflictos o riesgos detectados

- Hay dos rutas de Git disponibles: instalacion del sistema y runtime interno de Codex. El comando `git` resuelve primero a `C:\Program Files\Git\cmd\git.exe`, lo cual es correcto para uso del usuario.
- Python esta disponible como `python` y `py`, pero `pip` no esta publicado como comando directo. Usar `py -m pip` evita ambiguedades.
- PlatformIO no esta instalado. Se recomienda instalarlo mediante la extension oficial de VS Code o mediante un entorno Python aislado para evitar contaminar paquetes globales.
- Wokwi CLI requiere token `WOKWI_CLI_TOKEN` para ejecutar simulaciones con Wokwi CI/MCP.
- Wokwi MCP quedo registrado en Codex como servidor global apuntando al binario local del proyecto.
- `platformio device list` no devolvio puertos seriales. No hay una placa fisica conectada o detectable en esta sesion.

## Instalaciones completadas

- PlatformIO IDE para VS Code.
- C/C++ Extension para VS Code.
- Serial Monitor para VS Code.
- GitHub Pull Requests and Issues para VS Code.
- GitHub Actions para VS Code.
- Wokwi Extension para VS Code.
- PlatformIO Core CLI local en `.venv/`.
- Arduino CLI 1.5.1.
- Wokwi CLI 0.26.1 local en `tools/`.
- Wokwi MCP registrado en Codex.

## Pendiente

- Definir `WOKWI_CLI_TOKEN` en cada sesion o persistirlo en variables de entorno de usuario para que Wokwi CLI/MCP funcionen despues de reiniciar terminal o Codex.
- Reiniciar terminal o VS Code si se desea que `arduino-cli` quede disponible sin ruta absoluta.
- Simulacion Wokwi completa validada con token definido en la sesion actual.
- Validar carga en hardware fisico cuando se conecte una placa ESP32.

## Proyecto minimo creado

Archivos:

```text
platformio.ini
src/main.cpp
simulation/diagram.json
simulation/wokwi.toml
simulation/button_led.test.yaml
simulation/merge_firmware.py
```

El ejemplo contiene solamente infraestructura:

- `TaskSensor`: lee un boton fisico simulado.
- `TaskControl`: procesa el estado de entrada con prioridad intermedia.
- `TaskActuator`: enciende o apaga un LED.

No contiene sensor MQ, ADC definitivo, valvula ni logica de emergencia.

Flujo validado por diseno:

```text
Entrada fisica simulada -> CPU / FreeRTOS -> Actuador LED
```

## Verificaciones realizadas

Compilacion:

```powershell
.\.venv\Scripts\platformio run
```

Resultado:

```text
SUCCESS
RAM:   6.6% (used 21472 bytes from 327680 bytes)
Flash: 20.6% (used 270117 bytes from 1310720 bytes)
```

Artefactos generados:

```text
.pio/build/esp32doit-devkit-v1/firmware.elf
.pio/build/esp32doit-devkit-v1/firmware.bin
```

Base de datos de compilacion:

```powershell
.\.venv\Scripts\platformio run --target compiledb
```

Resultado:

```text
SUCCESS
compile_commands.json generado
```

Lint de Wokwi:

```powershell
.\tools\wokwi-cli.exe lint simulation\diagram.json
```

Resultado:

```text
Found 1 info
unsupported-part: Part "esp" uses undocumented type "board-esp32-devkit-c-v4".
```

El linter no reporto errores. Posteriormente se ajusto la placa a `wokwi-esp32-devkit-v1` para mejorar compatibilidad de simulacion con el firmware PlatformIO/ESP32. En ese tipo de placa, las conexiones usan nombres `D2` y `D4` en el diagrama para los GPIO 2 y 4 del firmware. Tambien se conecto UART0 (`TX0`/`RX0`) al `$serialMonitor` virtual para que Wokwi CLI pueda capturar la salida serial.

Simulacion Wokwi:

```powershell
.\tools\wokwi-cli.exe --timeout 5000 --expect-text "[SIGAS-RT] Prueba de entorno ESP32 + FreeRTOS iniciada" simulation
```

Resultado inicial sin token:

```text
Error: Missing WOKWI_CLI_TOKEN environment variable.
```

La simulacion quedo pendiente de token durante la primera auditoria. Despues de definir un token Wokwi en la sesion de PowerShell, la simulacion conecto con Wokwi Simulation API y el escenario `button_led.test.yaml` se completo correctamente.

Comando validado:

```powershell
cd simulation
..\tools\wokwi-cli.exe --timeout 30000 --scenario button_led.test.yaml --serial-log-file wokwi-serial.log .
```

Resultado validado:

```text
Connected to Wokwi Simulation API 1.0.0-20260903-g7707805d
[SIGAS-RT] Prueba de entorno ESP32 + FreeRTOS iniciada
[TaskSensor] Entrada fisica: boton=PRESIONADO
[TaskControl] CPU/RT: salida=ON prioridad=2
[TaskActuator] Actuador: LED=ON
[TaskActuator] Actuador: LED=OFF
[ESP32 button to LED smoke test] Scenario completed successfully
```

MCP Wokwi:

```powershell
codex mcp add Wokwi -- "C:\Users\josue\Proyectos\SIGAS-RT\tools\wokwi-cli.exe" mcp "C:\Users\josue\Proyectos\SIGAS-RT\simulation"
codex mcp get Wokwi
codex mcp list
```

Resultado:

```text
Wokwi enabled: true
transport: stdio
command: C:\Users\josue\Proyectos\SIGAS-RT\tools\wokwi-cli.exe
args: mcp C:\Users\josue\Proyectos\SIGAS-RT\simulation
```

La comunicacion MCP queda declarada en Codex. Para que el servidor MCP funcione despues de reiniciar Codex, `WOKWI_CLI_TOKEN` debe estar disponible en el entorno del proceso de Codex.

## Comandos utilizados

Instalar extensiones de VS Code:

```powershell
code --install-extension platformio.platformio-ide
code --install-extension ms-vscode.cpptools
code --install-extension ms-vscode.vscode-serial-monitor
code --install-extension github.vscode-pull-request-github
code --install-extension github.vscode-github-actions
code --install-extension wokwi.wokwi-vscode
```

Crear entorno PlatformIO local:

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install platformio
.\.venv\Scripts\platformio --version
```

Compilar y generar firmware combinado para Wokwi:

```powershell
.\.venv\Scripts\platformio run
```

El script `simulation/merge_firmware.py` se ejecuta despues del build y genera:

```text
simulation/firmware-merged.bin
```

Instalar Arduino CLI:

```powershell
winget install --id ArduinoSA.CLI --accept-package-agreements --accept-source-agreements
```

Instalar Wokwi CLI local:

```powershell
New-Item -ItemType Directory -Force -Path tools
Invoke-WebRequest -Uri https://github.com/wokwi/wokwi-cli/releases/download/v0.26.1/wokwi-cli-win-x64.exe -OutFile tools\wokwi-cli.exe
.\tools\wokwi-cli.exe --version
```

Registrar MCP:

```powershell
codex mcp add Wokwi -- "C:\Users\josue\Proyectos\SIGAS-RT\tools\wokwi-cli.exe" mcp "C:\Users\josue\Proyectos\SIGAS-RT\simulation"
```

## Fuentes oficiales consultadas

- PlatformIO: `https://docs.platformio.org/en/latest/faq/install-python.html`
- Wokwi CLI: `https://docs.wokwi.com/wokwi-ci/cli-installation`
- Wokwi CLI Usage: `https://docs.wokwi.com/wokwi-ci/cli-usage`
- Wokwi MCP: `https://docs.wokwi.com/wokwi-ci/mcp-support`
- Wokwi Automation Scenarios: `https://docs.wokwi.com/wokwi-ci/automation-scenarios`

## Pendiente de token Wokwi

Para que Wokwi CLI/MCP sigan funcionando tras abrir una terminal nueva o reiniciar Codex, persistir el token real como variable de entorno de usuario. No guardar el token en archivos del repositorio:

```powershell
setx WOKWI_CLI_TOKEN "wok_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Despues abrir una terminal nueva y ejecutar:

```powershell
cd simulation
..\tools\wokwi-cli.exe --timeout 10000 --scenario button_led.test.yaml .
codex mcp list
```
