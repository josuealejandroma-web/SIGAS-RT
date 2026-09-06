# Modo de presentacion SIGAS-RT

## Alcance

La presentacion conserva dos recorridos complementarios:

1. `visualization/blender/source/sigas_house.blend`: tour interior maestro de 15 ambientes, 529 frames, 24 FPS y aproximadamente 22 segundos.
2. `visualization/godot/`: exploracion libre interactiva y tour orbital compacto sobre el GLB exportado desde Blender.

Godot solo representa telemetria. No decide cierres de valvula, no calcula umbrales y no reemplaza la ruta critica `Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador`.

## Inicio

```powershell
tools\godot\godot.cmd --path visualization\godot
```

Godot inicia en `MODO: EXPLORACION LIBRE`, frente a la entrada. El menu superior permite cambiar entre `TOUR`, `EXPLORACION LIBRE` y `VISTA TECNICA`.

## Controles

| Control | Accion |
| --- | --- |
| `W`, `A`, `S`, `D` | Caminar. |
| Mouse | Mirar en primera persona. |
| `Shift` | Movimiento rapido. |
| `Ctrl` | Movimiento preciso para inspeccion. |
| Rueda del mouse | Ajustar velocidad base entre 1.4 y 6.0 m/s. |
| `Esc` | Liberar o capturar el mouse; tambien cierra la ayuda. |
| `1` a `9` | Ir a una zona segura. |
| `0` | Abrir vista tecnica general. |
| `G`, `U` | Ir a planta baja o planta alta. |
| `T` | Alternar arquitectura y vista tecnica sin abandonar el modo libre. |
| `H` | Alternar HUD completo, compacto y oculto. |
| `Space` o `P` | Pausar o reanudar el replay local. No pausa telemetria `LIVE`. |
| `F1` | Mostrar u ocultar ayuda. |
| `R` | Restablecer la camara frente a la entrada. |
| `F5` | Alternar Presentation Mode con HUD compacto y comienzo exterior. |

La camara usa FOV de 78 grados, pitch limitado y altura visual de 1.70 m.

## Accesos rapidos

Las posiciones son coordenadas de los pies en Godot. Se eligieron junto a `CameraFocus_*` y `Marker_*`, pero se separaron de los markers elevados para evitar aparecer dentro de muros o muebles.

| Tecla | Zona | Posicion segura `(X, Y, Z)` |
| --- | --- | --- |
| `1` | Exterior / fachada | `(3.65, 0.16, 5.25)` |
| `2` | Sala / comedor | `(-0.85, 0.18, 2.45)` |
| `3` | Cocina / Zona 1 | `(-2.35, 0.18, -1.20)` |
| `4` | Area tecnica / Zona 2 | `(2.65, 0.18, -1.35)` |
| `5` | Medidor y valvulas | `(-5.85, 0.16, -1.80)` |
| `6` | Panel SIGAS / ESP32 | `(0.25, 0.18, 1.90)` |
| `7` | Planta alta | `(1.25, 3.32, 1.80)` |
| `8` | Dormitorio principal | `(-3.25, 3.32, -0.65)` |
| `9` | Balcon / vista general | `(0.00, 3.75, 4.18)` |
| `0` | Vista tecnica general | Camara orbital seccionada. |

## Navegacion y colisiones

`NavigationCollisionBuilder.gd` genera cajas de colision de bajo costo a partir de muros, losas, mobiliario grande, medidor, valvulas y barandas del GLB. Tambien agrega:

- rampa invisible sobre los peldaños para un ascenso estable;
- limites alrededor del jardin;
- limites laterales y frontal del balcon;
- 14 transiciones de proximidad para entrada, area tecnica, escalera, dormitorios, bano superior y balcon.

El modelo Blender actual representa la puerta y varios tabiques como prismas continuos, y la escalera visual termina antes de la losa. Las transiciones se activan antes de esos cierres y colocan al personaje en un punto despejado al otro lado. La camara no se desplaza a traves del muro y existe un periodo de bloqueo para evitar rebotes.

La geometria Blender, sus markers y el tour interior no se modifican.

## HUD y componentes

El HUD compacto mantiene `SIGAS-RT`, estado, ADC de Z1/Z2, valvula y fuente `LIVE`/`REPLAY`. Las etiquetas de proximidad se limitan al piso actual y cubren:

- MQ-2 Zona 1 y Zona 2;
- ESP32, buzzer y LEDs;
- medidor, valvula principal y valvula automatica;
- tuberia principal y ramales;
- calefon y cocina.

Sensor Z1/Z2 muestran ADC y nivel recibidos. La valvula y el panel muestran el estado recibido. Las nubes de fuga son conceptuales; no son CFD ni una estimacion certificada de dispersion.

## Replay durante el recorrido

Sin bridge, la secuencia local recorre `SYSTEM_STARTUP`, `SYSTEM_NORMAL`, `SYSTEM_WARNING`, `SYSTEM_CRITICAL` y `SYSTEM_SAFE_LATCHED`. El jugador conserva control mientras cambian sensores, LEDs, buzzer, fugas y valvula. Al recibirse UDP valido, la fuente cambia a `LIVE` y la camara sigue independiente de la telemetria.

## Secuencia recomendada

1. Seleccionar `TOUR` para presentar la fachada y el conjunto.
2. Seleccionar `EXPLORACION LIBRE` y usar `1` para comenzar frente a la entrada.
3. Entrar caminando, ir a sala/comedor y usar `3` para inspeccionar Sensor Z1.
4. Usar `4`, `5` y `6` para area tecnica, medidor/valvulas y panel ESP32.
5. Subir por la escalera o usar `U`; recorrer planta alta, dormitorio y balcon con `7`, `8`, `9`.
6. Presionar `0` o `T` para exponer tuberias y actuadores en vista tecnica.
7. Ejecutar replay y caminar mientras se observa el cierre automatico reportado por telemetria.

## Validacion

```powershell
tools\godot\godot.cmd --headless --path visualization\godot --quit
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/VisualSelfTest.gd
tools\godot\godot.cmd --headless --path visualization\godot --script res://scripts/FreeWalkSelfTest.gd
powershell -ExecutionPolicy Bypass -File scripts\verify_all.ps1 -SkipWokwi
```

`FreeWalkSelfTest.gd` cubre `FREE-01` a `FREE-17` y comprobaciones adicionales de entrada y mobiliario. Las capturas de validacion grafica se generan localmente dentro de `.godot/` y no se versionan.
