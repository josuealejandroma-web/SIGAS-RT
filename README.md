# SIGAS-RT

Sistema Inteligente de Deteccion y Corte Automatico de Gas en Tiempo Real.
Es un prototipo academico sobre ESP32, FreeRTOS, PlatformIO y Wokwi, con un
gemelo digital local auxiliar en Godot y un modelo maestro en Blender.

```text
Sensor -> ADC -> CPU -> Procesamiento en Tiempo Real -> Actuador
```

La deteccion, el enclavamiento fail-safe y la politica de actuadores se ejecutan
localmente en el firmware. Godot representa telemetria y nunca sustituye la
logica critica ni envia ordenes directas a actuadores.

## Estado de la evidencia

El criterio `RT-03` mide desde `T_CRITICAL_CONFIRMED` hasta
`T_ACTUATOR_RECEIVED`, con deadline experimental de 500000 us.

| Evidencia | Estado |
| --- | --- |
| Campana historica Wokwi | Worst Observed Response Time 22504 us, 25 corridas, 0 fallas de deadline. |
| Campana temporal final | `PASS WOKWI FINAL`: Worst Observed Response Time 22346 us, 25 corridas, 0 fallas de deadline y margen de 477654 us (95.5308 %). |
| Revision medida | Commit `679b489abe2d166ed1c0a60a50c5b4c0baa9d195`; firmware critico equivalente a `9ae0c351a17d3f7b37aae30eeda405836dfe81bc`. |
| Validacion local | Tests host, bridge, Godot, Blender, builds PlatformIO y escaneo de secretos. |

Los CSV en `simulation/results/` contienen la campana temporal final y estan
identificados por `simulation/results/final_validation_manifest.json`.
Detalles: `docs/analisis_temporal.md`, `docs/resultados_temporales.md` y
`docs/matriz_trazabilidad.md`.

## Reproduccion desde cero

Requisitos usados en esta revision:

| Herramienta | Version usada | Instalacion reproducible |
| --- | --- | --- |
| Python | 3.14.3 | Instalar Python 3 y usar `py` o `python` desde `PATH`. |
| PlatformIO Core | 6.1.19 | Se instala en el entorno virtual con `requirements-dev.txt`. |
| Godot | 4.7.2 stable | Instalar Godot 4 y agregar `godot` a `PATH`, o usar un binario local ignorado en `tools/godot/`. |
| Blender | 5.1.0 | Instalar Blender y agregar `blender` a `PATH`. |
| Wokwi CLI | 0.26.1 | Binario local ignorado en `tools/`; solo necesario para las fases Wokwi. |

Clonar y seleccionar la rama de trabajo:

```powershell
git clone https://github.com/josuealejandroma-web/SIGAS-RT.git
cd SIGAS-RT
git switch feature/godot-digital-twin
```

Crear el entorno Python e instalar dependencias:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

`tools/` contiene ejecutables locales opcionales y esta ignorado por Git. Las
rutas de instalacion dependen de cada equipo; ninguna ruta personal es un
requisito del proyecto.

## Compilacion

Firmware normal:

```powershell
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
```

Firmware con telemetria para visualizacion:

```powershell
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization
```

Variante local de carga diagnostica:

```powershell
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-diagnostic-load
```

## Validacion local sin Wokwi

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1 -SkipWokwi
```

Este comando ejecuta tests host del firmware, bridge, resumen temporal, Blender,
Godot, builds PlatformIO, seleccion de artefactos, `git diff --check` y secret
scan. No inicia Wokwi ni genera una campana temporal cuando se usa
`-SkipWokwi`.

## Gemelo digital local

Abrir Godot sin bridge:

```powershell
godot --path visualization\godot
```

La aplicacion inicia en exploracion libre. En el HUD completo:

- `Demo sintetica` ejecuta una secuencia manual local, rotulada
  `SYNTHETIC DEMO`.
- `Replay grabado` reproduce la captura historica identificada, rotulada
  `RECORDED REPLAY`.
- `Space` o `P` pausa y reanuda cualquiera de esas dos fuentes locales.

Las pruebas headless pueden ejecutarse por separado:

```powershell
godot --headless --path visualization\godot --quit
godot --headless --path visualization\godot --script res://scripts/VisualSelfTest.gd
godot --headless --path visualization\godot --script res://scripts/FreeWalkSelfTest.gd
godot --headless --path visualization\godot --script res://scripts/TelemetrySelfTest.gd
```

El recorrido maestro de Blender esta en
`visualization/blender/source/sigas_house.blend`: 15 ambientes, 529 frames a
24 FPS y aproximadamente 22.04 segundos.

## Bridge y Wokwi

Wokwi solo es necesario para telemetria en vivo y regresiones temporales. El
token debe existir exclusivamente como variable de entorno de Windows con el
nombre `WOKWI_CLI_TOKEN`; no debe guardarse en `.env`, archivos MCP, archivos
del proyecto, Git o documentacion.

Para persistir un valor ya cargado de forma segura en `$token` y propagarlo a
la terminal actual sin imprimirlo:

```powershell
[Environment]::SetEnvironmentVariable("WOKWI_CLI_TOKEN", $token, "User")
$env:WOKWI_CLI_TOKEN = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "User")
```

Con Wokwi CLI disponible y la variable configurada, iniciar bridge y Godot:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_digital_twin.ps1
```

El bridge acepta solo escenarios permitidos, usa UDP local y no controla
actuadores criticos. La campana temporal se ejecuta unicamente en una fase de
validacion Wokwi expresamente autorizada.

## Limitaciones

- Wokwi no certifica hard real-time ni tiempos fisicos de actuadores.
- Los umbrales ADC son experimentales de simulacion, no ppm certificados.
- Los sensores MQ, el servo, el modelo 3D y la fuga visual no certifican una
  instalacion real de gas.
