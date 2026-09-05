# Pipeline Blender para SIGAS-RT

## Entorno detectado

| Elemento | Resultado |
| --- | --- |
| Ejecutable | `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe` |
| Version | Blender 5.1.0 |
| Headless | PASS con `--background --factory-startup` |
| `bpy` | PASS con importacion de `bpy` y lectura de `bpy.app.version_string` |
| Exportacion GLB | PASS con `visualization\godot\models\sigas_house.glb` |

## Flujo

```text
visualization/blender/scripts/*.py
    -> visualization/blender/source/sigas_house.blend
    -> visualization/godot/models/sigas_house.glb
    -> visualization/godot/scripts/DigitalTwin.gd
    -> telemetria @SIGAS reflejada visualmente
```

Blender es el origen de la escena fisica. Godot conserva la interaccion, el HUD, la camara, las particulas conceptuales de fuga y la aplicacion de estados recibidos desde firmware/bridge.

## Regeneracion

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python visualization\blender\scripts\create_scene.py
tools\godot\godot.cmd --headless --path visualization\godot --import
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/VisualSelfTest.gd
```

## Decision de assets

Se usa un modelo maestro `sigas_house.glb` dentro del proyecto Godot para que el runtime pueda importarlo como recurso `res://models/sigas_house.glb`.

Tambien se deja una copia de exportacion en `visualization/blender/exports/sigas_house.glb` como salida directa del pipeline Blender. El archivo fuente reproducible queda en `visualization/blender/source/sigas_house.blend`.

## Jerarquia

La escena usa nombres `SIGAS_*` para elementos fisicos y nombres `Marker_*` / `CameraFocus_*` para puntos de referencia de Godot.

Elementos principales:

- `SIGAS_GasMeter`, `SIGAS_MainValve`, `SIGAS_AutoValve`, `SIGAS_MainPipe`.
- `SIGAS_Pipe_Kitchen`, `SIGAS_Pipe_Heater`.
- `SIGAS_MQ2_Z1`, `SIGAS_MQ2_Z2`.
- `SIGAS_ESP32`, `SIGAS_ControlPanel`, `SIGAS_Buzzer`, `SIGAS_LedGreen`, `SIGAS_LedRed`.
- `SIGAS_LeakPoint_Z1`, `SIGAS_LeakPoint_Z2`.
- `CameraFocus_Exterior`, `CameraFocus_Kitchen`, `CameraFocus_Technical`, `CameraFocus_ControlPanel`, `CameraFocus_UpperFloor`.

## Limitaciones

La fuga de gas es una visualizacion conceptual. No modela dinamica de fluidos, concentracion ppm ni dispersion fisica certificada.

El modelo es tecnico y academico: prioriza legibilidad, jerarquia y trazabilidad frente a fotorealismo.
