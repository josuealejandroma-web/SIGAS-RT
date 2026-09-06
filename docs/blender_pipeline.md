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

## Sistema de ejes

Los scripts mantienen coordenadas de autoria `X derecha, Y arriba, Z profundidad`, iguales a las usadas por Godot. Antes de agregar luces y camara, `create_scene.py` agrupa la geometria y los markers bajo `SIGAS_ModelRoot` y aplica una rotacion de 90 grados en X. De este modo la casa se presenta correctamente con `Z` arriba dentro de Blender y la conversion normal de GLB conserva las coordenadas esperadas por Godot.

El `.blend` se guarda con `SIGAS_Camera_Interior` activa, vista de camara, sombreado de materiales y la opcion `Lock Camera to View`. Al abrirlo no es necesario reorientar manualmente la escena. `SIGAS_Camera_Overview` permanece disponible para una vista exterior estatica.

## Recorrido interior

La linea de tiempo contiene un recorrido guiado de 529 fotogramas a 24 FPS, aproximadamente 22 segundos. Sus 15 marcadores identifican entrada y bano de visitas, sala, comedor, panel de control, cocina, area tecnica, valvula automatica de gas, escaleras, pasillo superior, tres dormitorios, bano superior, balcon y vista general.

- `Espacio`: reproduce o pausa el recorrido.
- Marcadores de la linea de tiempo: permiten saltar directamente a cada ambiente.
- Vista de camara: con `Lock Camera to View` activo, orbitar, desplazar o acercar la vista mueve la camara para inspeccion manual.
- `Vista > Navegacion > Recorrer navegacion`: activa el desplazamiento tipo primera persona; `W`, `A`, `S` y `D` desplazan la camara y `Esc` termina el modo.

La coleccion `SIGAS_BlenderInteriorTour` contiene solamente camara, objetivo y luces de presentacion. `create_scene.py` exporta el GLB antes de crear esta coleccion, por lo que estos elementos no se incorporan al modelo consumido por Godot.

## Pulido visual aplicado

La escena se genera por scripts y no requiere edicion manual en Blender. El pulido visual agrega:

- biseles y normales ponderadas en geometria prismatica para evitar bordes excesivamente planos;
- variacion procedural en muros, piso, madera, techo y jardin;
- fachada con marquesina, paneles, jardineras, canaletas, cumbrera y buhardillas;
- ventanas con marcos, travesanos y alfajias;
- mobiliario interior para cocina, sala, comedor, dormitorios, bano y area tecnica;
- medidor, valvulas, tuberias, soportes, abrazaderas y flechas de flujo mas legibles;
- sensores MQ-2, gabinete ESP32, antena, borneras, puerta translucida y rejilla de buzzer con mayor detalle;
- luces puntuales por zona y camara general ajustada para una inspeccion menos cenital.
- orientacion vertical nativa de Blender y encuadre inicial persistente sobre la fachada.
- recorrido interior animado con control manual de la camara y marcadores por ambiente.

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
- `SIGAS_PipeSupport_*`, `SIGAS_FlowArrow_*`, `SIGAS_MeterNeedle`, `SIGAS_MainValve_Handle`, `SIGAS_AutoValve_ActuatorBox`.
- `SIGAS_MQ2_Z1`, `SIGAS_MQ2_Z2`.
- `SIGAS_SensorVentRing_Z1`, `SIGAS_SensorVentRing_Z2`.
- `SIGAS_ESP32`, `SIGAS_ControlPanel`, `SIGAS_Buzzer`, `SIGAS_LedGreen`, `SIGAS_LedRed`.
- `SIGAS_ControlPanel_GlassDoor`, `SIGAS_ESP32_Antenna`, `SIGAS_Buzzer_Grill`.
- `SIGAS_LeakPoint_Z1`, `SIGAS_LeakPoint_Z2`.
- `CameraFocus_Exterior`, `CameraFocus_Kitchen`, `CameraFocus_Technical`, `CameraFocus_ControlPanel`, `CameraFocus_UpperFloor`.

## Limitaciones

La fuga de gas es una visualizacion conceptual. No modela dinamica de fluidos, concentracion ppm ni dispersion fisica certificada.

El modelo es tecnico y academico: prioriza legibilidad, jerarquia y trazabilidad frente a fotorealismo.
