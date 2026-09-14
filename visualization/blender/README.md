# Blender SIGAS-RT

Esta carpeta contiene el pipeline reproducible para la casa de dos pisos y el sistema fisico SIGAS-RT.

## Gemelo LIVE en Blender

Desde la raiz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_blender_twin.ps1
```

Requiere Python 3, `.venv/Scripts/platformio.exe`, `tools/wokwi-cli.exe`,
Blender 5.1 y `WOKWI_CLI_TOKEN` en el entorno Process o User de Windows.
Para otra ubicacion de Blender, usar `-BlenderCommand "ruta/al/blender.exe"`.
El launcher compila la variante de visualizacion y abre el archivo maestro con
el panel nativo `3D Viewport > Sidebar (N) > SIGAS-RT`. No guarda la escena ni
instala un addon global. Usa Material Preview y mantiene el recorrido y Space.

Cerrar Blender detiene los procesos que inicio el launcher, incluidos los hijos
de Wokwi/PlatformIO. No termina otros procesos Blender/Python. Los logs de esta
sesion se guardan bajo `.pio/blender-live/`, ignorado por Git.

El boton `Iniciar LIVE` activa un receptor; pulsarlo nuevamente no crea otro.
`Detener` cierra receptor y timer, y restaura materiales y animacion de valvula.
Detener la recepcion no cancela una corrida Wokwi ya enviada: para cerrar tambien
el bridge y sus hijos, cerrar Blender. Abrir o guardar un archivo Blender detiene
LIVE y restaura la escena antes de la operacion. Se puede reiniciar desde el panel.

El bridge conserva sus puertos: telemetria hacia `127.0.0.1:45701` y comandos
en `127.0.0.1:45702`. Blender y Godot son consumidores alternativos; cerrar el
otro consumidor y su bridge antes de iniciar este launcher. Un puerto ocupado
produce un error explicito, sin cambiar de puerto ni reutilizar un socket ajeno.

```text
Blender -> comando UDP -> bridge existente -> escenario Wokwi
Wokwi -> firmware -> serial -> bridge existente -> UDP -> Blender
```

El panel solicita Normal, Seguro, Fuga Cocina, Fuga Calefon, Fuga Doble,
Pico Aislado, Falla Sensor, Timeout Inicial y Full Demo mediante los comandos
canonicos del catalogo. Enviar un datagrama no confirma que el bridge haya
arrancado el escenario: el estado operacional distingue solicitud enviada de
telemetria recibida. El protocolo existente no ofrece un ACK de comandos.

## Fuente y freshness

- `LIVE WOKWI`: paquetes validos del bridge. `SIN DATOS` antes del primero.
- `LIVE`: edad local monotona menor de 1500 ms.
- `STALE`: edad desde 1500 ms hasta menos de 3000 ms.
- `DISCONNECTED`: 3000 ms o mas, ninguna telemetria, o receptor detenido.
- `RECORDED REPLAY`: captura historica existente, con boton propio de pausa;
  nunca se identifica como LIVE ni como una nueva medicion temporal.

Ante STALE/DISCONNECTED se conserva el ultimo estado recibido con advertencia
visible de datos antiguos. La falta de paquetes no cambia la valvula ni el estado
del sistema. El RT-03 es N/A hasta recibir timing completo y consistente; luego
muestra el ultimo evento, su SEQ, respuesta, deadline y resultado recibido.
Los paquetes invalidos no actualizan freshness. Cada nueva solicitud de escenario
limpia el timing anterior; el protocolo no contiene un identificador de sesion,
por lo que no puede atribuir un datagrama tardio a una ejecucion concreta.

## Representacion

Se usan los objetos maestros `SIGAS_MQ2_Z1/Z2`, `SIGAS_AutoValve_Handle`,
`SIGAS_LedGreen`, `SIGAS_LedRed`, `SIGAS_Buzzer` y `SIGAS_LeakPoint_Z1/Z2`.
Los materiales `SIGAS_LIVE_*` son temporales; los materiales originales no se
editan. Los actuadores siguen `valve`, `buzzer`, `green_led` y `red_led` recibidos,
independientemente de `SystemState`.

La valvula gira en Y local de 0 grados (OPEN) a 90 grados (CLOSED), conforme a
las propiedades del maestro. Durante LIVE se suspende solo su Action; al detener
se restaura, conservando el Action de la camara y los 15 marcadores del recorrido.
La interpolacion de 0.3 s es estetica y no mide el movimiento fisico de una valvula.

Cada zona HIGH activa ocho particulas geometricas ligeras. Son fugas conceptuales,
sin CFD, concentracion fisica, volumenes ni luces adicionales. Los LEDs y buzzer
usan emision moderada. El buzzer se indica visualmente, sin audio obligatorio.
Material Preview es la opcion inicial; Rendered/Eevee puede seleccionarse en el
viewport usando la iluminacion existente.

Se soportan los seis estados del contrato. `SYSTEM_CRITICAL` es transitorio en
el firmware y puede no aparecer en los paquetes periodicos `state`; se valida
con datos locales en el selftest, sin fabricarlo al recibir un timing. Tambien
pueden faltar paquetes `state` en Timeout Inicial porque el firmware requiere
una primera muestra para publicar `@SIGAS`. El panel permanece SIN DATOS en ese
caso, aunque el escenario y el cierre seguro se registren en el log del bridge.

Blender es visualizacion auxiliar: solicita escenarios al bridge y no controla
actuadores directamente. Toda la logica de seguridad reside en el firmware.
Godot queda disponible como respaldo en su implementacion existente.

## Validacion LIVE sin Wokwi

```powershell
python -m unittest discover visualization/blender/live/tests -v
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup visualization/blender/source/sigas_house.blend --python-exit-code 1 --python visualization/blender/live/blender_live_selftest.py
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1 -SkipWokwi
```

Los tests verifican JSON/timing adverso, freshness, socket exclusivo, cola acotada,
start/stop idempotentes, aislamiento de procesos, comandos del panel por UDP,
los seis estados visuales, materiales restaurados, proteccion del hilo principal,
tour y replay. No consumen Wokwi ni cambian los CSV de la campana final.

La prueba interactiva opcional `launcher.py --blender "ruta/al/blender.exe" --e2e`
abre el panel y observa una unica pulsacion manual de Full Demo. Es una prueba
con cuota Wokwi: no ejecutarla como parte de tests locales rutinarios. El informe
queda en `.pio/blender-live/live_e2e_report.json`; su alcance es solo visualizacion.
Cerrar Blender al finalizar tambien comprueba la limpieza del launcher.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `scripts/` | Scripts `bpy` que generan geometria, materiales, markers y exportacion. |
| `live/` | Consumidor UDP, sesion, controlador visual, panel, launcher y pruebas. |
| `source/sigas_house.blend` | Archivo Blender generado por script. |
| `exports/sigas_house.glb` | Copia del GLB exportado desde Blender. |

El GLB usado por Godot queda en `visualization/godot/models/sigas_house.glb`.

## Orientacion al abrir

La geometria se modela con ejes compatibles con Godot (`Y` arriba) y se agrupa bajo `SIGAS_ModelRoot`, cuya rotacion la presenta con `Z` arriba en Blender. El archivo generado abre directamente en `SIGAS_Camera_Interior`, en sombreado de materiales y con la camara bloqueada a la vista; no se debe rotar la casa manualmente para exportarla.

## Ver el interior

La linea de tiempo ofrece un recorrido guiado de aproximadamente 22 segundos y 15 marcadores de ambiente. Presione `Espacio` para reproducir o pausar. Los marcadores permiten saltar a una habitacion concreta.

Para explorar manualmente, mantenga la vista de camara activa y use orbita, desplazamiento y zoom; `Lock Camera to View` ya esta habilitado. El modo `Vista > Navegacion > Recorrer navegacion` permite desplazarse con `W`, `A`, `S` y `D`, y se cierra con `Esc`.

La camara y las luces del recorrido son recursos de presentacion del `.blend`. Se crean despues de exportar el GLB y no forman parte del modelo cargado por Godot.

## Regenerar

```powershell
blender --background --factory-startup --python visualization\blender\scripts\create_scene.py
tools\godot\godot.cmd --headless --path visualization\godot --import
```

## Scripts

- `create_scene.py`: orquestador.
- `create_camera_tour.py`: recorrido interior, marcadores de ambiente e iluminacion de presentacion.
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
- camara interior animada y movible con marcadores para todas las zonas de la casa.

`validate_scene.py` inspecciona cada frame del 1 al 529 contra los limites de los muros. La transicion Panel de control -> Cocina incluye puntos intermedios para mantener libres los frames 143, 144 y 145.

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
