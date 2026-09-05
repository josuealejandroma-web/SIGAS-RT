# Blender SIGAS-RT

Esta carpeta contiene el pipeline reproducible para la casa de dos pisos y el sistema fisico SIGAS-RT.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `scripts/` | Scripts `bpy` que generan geometria, materiales, markers y exportacion. |
| `source/sigas_house.blend` | Archivo Blender generado por script. |
| `exports/sigas_house.glb` | Copia del GLB exportado desde Blender. |

El GLB usado por Godot queda en `visualization/godot/models/sigas_house.glb`.

## Regenerar

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python visualization\blender\scripts\create_scene.py
tools\godot\godot.cmd --headless --path visualization\godot --import
```

## Scripts

- `create_scene.py`: orquestador.
- `create_materials.py`: materiales tecnicos con variacion procedural.
- `create_house.py`: helpers geometricos, fachada, cubierta, balcon, ventanas y shell de casa.
- `create_ground_floor.py`: planta baja, cocina, area tecnica y escaleras.
- `create_upper_floor.py`: dormitorios, bano y terraza.
- `create_gas_system.py`: medidor, valvulas, tuberias, soportes, direccion de flujo y puntos de fuga.
- `create_sensors.py`: sensores MQ-2 con rejillas y pines.
- `create_esp32.py`: gabinete, ESP32, borneras, LEDs y buzzer.
- `create_markers.py`: markers para Godot.
- `export_assets.py`: guardado `.blend` y exportacion GLB.

## Pulido visual

El modelo mantiene una lectura tecnica antes que fotorealista, pero agrega detalle suficiente para identificar zonas y componentes sin depender del HUD:

- fachada con marquesina, jardineras, paneles, canaletas, cumbrera y buhardillas;
- ventanas con marcos, travesanos y alfajias;
- cocina con cubierta, fregadero, grifo, gabinetes superiores, campana y placa de advertencia;
- sala/comedor, dormitorios y bano con mobiliario basico para escala espacial;
- area tecnica con calentador, estante de servicio y rotulacion preventiva;
- sistema de gas con medidor instrumentado, valvula manual, actuador de valvula, abrazaderas, soportes y flechas de flujo;
- gabinete de control con puerta translucida, modulo ESP32, antena, borneras y rejilla de buzzer;
- camara general e iluminacion interior ajustadas para inspeccion visual.

## Distribucion

Planta baja:

- entrada principal;
- sala;
- comedor;
- cocina / Zona 1;
- escaleras;
- bano de visitas;
- area tecnica / Zona 2;
- medidor exterior y entrada de gas.

Planta alta:

- dormitorio principal;
- dos dormitorios adicionales;
- bano;
- pasillo;
- balcon/terraza.

## Integracion

Godot instancia `res://models/sigas_house.glb` desde `DigitalTwin.gd`. Los estados recibidos por telemetria modifican materiales de sensores, ESP32, valvula, LEDs, buzzer y fugas conceptuales sin ejecutar logica critica dentro de Godot.
