# SIGAS-RT

Sistema Inteligente de Deteccion y Corte Automatico de Gas en Tiempo Real.

Proyecto académico de Sistemas de Tiempo Real Crítico.

## Arquitectura principal

```text
Sensor -> ADC -> CPU -> Procesamiento en Tiempo Real -> Actuador
```

## Tecnologias

- ESP32
- C/C++
- FreeRTOS
- PlatformIO
- Wokwi
- Wokwi CLI/MCP
- Godot 4 para gemelo digital local auxiliar
- Python 3 para bridge local de telemetria

## Estado del proyecto

El nucleo embebido ya implementa adquisicion ADC simulada, procesamiento de seguridad en FreeRTOS, enclavamiento fail-safe, rearme manual condicionado, timeout de sensores y medicion temporal. La visualizacion Godot se mantiene como herramienta auxiliar: no contiene la logica critica ni controla actuadores reales.

## Validacion actual

El criterio temporal principal (`RT-03`) se mide desde `T_CRITICAL_CONFIRMED` hasta `T_ACTUATOR_RECEIVED`.

| Metrica | Resultado |
| --- | ---: |
| Deadline experimental | 500000 us |
| Worst Observed Response Time | 22502 us |
| Margen observado | 477498 us |
| Corridas temporales | 25 |
| Fallas de deadline | 0 |

La evidencia esta documentada en:

- `docs/analisis_temporal.md`
- `docs/resultados_temporales.md`
- `docs/matriz_trazabilidad.md`
- `simulation/results/`

## Ejecucion local

Compilar firmware normal:

```powershell
.\.venv\Scripts\platformio run -e esp32doit-devkit-v1
```

Ejecutar mediciones temporales:

```powershell
powershell -ExecutionPolicy Bypass -File simulation\run_timing_measurements.ps1 -Runs 20 -LoadRuns 5 -TimeoutMs 30000
```

El token de Wokwi debe estar en la variable de entorno de usuario o de proceso `WOKWI_CLI_TOKEN`. No se almacena en el repositorio.

## Gemelo digital local

El gemelo digital esta en `visualization/`:

- `visualization/godot/`: casa 3D con tuberias, sensores, ESP32, valvula, LEDs, buzzer, HUD y camara orbital.
- `visualization/bridge/`: bridge Python local entre Wokwi CLI y Godot.
- `visualization/scenarios/`: comandos permitidos y metadatos visuales.

Ejecutar pruebas del bridge:

```powershell
python -m unittest discover visualization\bridge\tests
```

Compilar firmware con telemetria para visualizacion:

```powershell
.\.venv\Scripts\platformio run -e esp32doit-devkit-v1-visualization
```

Abrir el gemelo digital y bridge local:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_digital_twin.ps1
```

Si `godot` no esta en `PATH`, el script deja claro que debe instalarse Godot 4 o ejecutarse manualmente el proyecto `visualization\godot`.

## Verificacion

Verificacion local amplia:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1
```

La validacion Wokwi requiere `WOKWI_CLI_TOKEN` en el entorno. La validacion headless de Godot requiere `godot` en `PATH`; si no esta disponible, el script lo informa sin almacenar credenciales.

## Limitaciones

- Wokwi no certifica comportamiento hard real-time ni tiempos fisicos de actuadores.
- Los umbrales ADC son experimentales de simulacion, no ppm certificados.
- El gemelo digital es observabilidad y demostracion local; la funcion critica permanece en ESP32/FreeRTOS.
