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
- `create_materials.py`: materiales tecnicos.
- `create_house.py`: helpers geometricos y shell de casa.
- `create_ground_floor.py`: planta baja, cocina, area tecnica y escaleras.
- `create_upper_floor.py`: dormitorios, bano y terraza.
- `create_gas_system.py`: medidor, valvulas, tuberias y puntos de fuga.
- `create_sensors.py`: sensores MQ-2.
- `create_esp32.py`: gabinete, ESP32, LEDs y buzzer.
- `create_markers.py`: markers para Godot.
- `export_assets.py`: guardado `.blend` y exportacion GLB.

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
