# Manual de uso del simulador SIGAS-RT

Este documento explica únicamente el uso de la pantalla del simulador. No es
un manual de instalación ni de desarrollo.

## Abrir el simulador

Abre la dirección local que te haya proporcionado el operador:

<http://127.0.0.1:5173/>

En la demo sin MATLAB verás `SIMULACIÓN LOCAL` (`MOCK_SIM`) y podrás probar los botones directamente. Para usar el modelo MATLAB, espera a ver `MATLAB_SIM` y `Sesión conectada`. Si aparece `CALCULANDO` o
`REPRODUCIENDO RESULTADOS`, espera a que termine antes de pulsar otro escenario.

## Controles de la escena 3D

- Arrastra con el ratón para girar la vista.
- Usa la rueda para acercar o alejar.
- El selector de cámara ofrece `EXTERIOR`, `COCINA`, `LIVING`, `AREA_TECNICA`,
  `MANIFOLD_MEDIDOR`, `VISTA_SUPERIOR` y `XRAY`.
- Las pestañas `CASA`, `XRAY`, `TUBERÍAS`, `PRESIÓN` y `SEGURIDAD` cambian la
  forma de visualizar la casa. Cambiar de pestaña no inicia una simulación.
- Pulsa una etiqueta de sensor o válvula para ver su detalle.

## Ejecutar un escenario

Los pasos de cálculo y reproducción siguientes corresponden a MATLAB. En la demo local, los escenarios son secuencias sintéticas y empiezan directamente al pulsar su botón.

1. En el panel `ESCENARIOS`, pulsa el caso que quieras observar.
2. Espera durante `CALCULANDO`.
3. Observa los datos mientras aparece `REPRODUCIENDO RESULTADOS`.
4. Cuando aparezca `SIMULACIÓN FINALIZADA`, revisa el estado final.
5. Para otra prueba, pulsa otro escenario.

Los botones se desactivan mientras el simulador está ocupado. `SIMULACIÓN
FINALIZADA` no significa que haya un fallo: significa que terminó esa corrida.

## Qué significan los paneles

- `SYSTEM STATE`: estado general (`NORMAL`, `WARNING`, `CRITICAL`,
  `SAFE_LATCHED` o `FAULT`).
- `GAS SENSORS`: lectura ADC, nivel y validez de GS1/Z1 (cocina), GS2/Z2
  (área técnica) y GS3/Z3 (living).
- `PRESSURE`: presión de P0/P1 y de las ramas PK, PT y PL, en mbar.
- `FLOW`: caudal, en kg/s.
- `VALVES`: estado de VM (maestra), VK (cocina), VT (técnica) y VL (living).
- `INDICATORS`: buzzer, LED verde y LED rojo.
- `TIMELINE` y las gráficas: cambios de eventos y valores durante la corrida.

Los valores ADC son propios de la simulación; no son ppm certificados.
Un tubo rojo en la vista `PRESIÓN` representa una presión alta dentro de su
escala, no confirma por sí solo una fuga.

## Probar una fuga

El simulador incluye cuatro escenarios relacionados con fugas:

| Escenario | Resultado esperado |
| --- | --- |
| `FUGA COCINA` | Registra `GAS_LEAK` en Z1 y cierra VK. |
| `FUGA TÉCNICA` | Registra `GAS_LEAK` en Z2 y cierra VT. |
| `FUGA LIVING` | Registra `GAS_LEAK` en Z3 y cierra VL. |
| `MULTIZONA` | Registra `MULTI_ZONE` y cierra VM, VK, VT y VL. |

Para hacer una demostración clara:

1. Ejecuta `NORMAL` y espera las cuatro válvulas abiertas.
2. Pulsa `FUGA COCINA`.
3. Espera a que termine la reproducción.
4. Comprueba `EVENT = GAS_LEAK`, zona `Z1`, `VK = CLOSED` o `CERRADA`,
   `CRITICAL` y después `SAFE_LATCHED`.
5. Comprueba `BUZZER ON`, `RED LED ON` y `GREEN LED OFF`.

El estímulo de fuga comienza durante el tiempo simulado. El modelo confirma la
condición antes de cerrar, por lo que no debes esperar que la válvula cambie
en la primera muestra.

## Qué ocurre cuando se confirma la fuga

El controlador simulado:

1. Detecta el nivel de gas y la zona afectada.
2. Registra el evento de fuga.
3. Cierra la válvula de la zona; si hay varias zonas afectadas, cierra también
   la válvula maestra y las demás válvulas.
4. Activa la alarma y deja el sistema en `SAFE_LATCHED`.

`SAFE_LATCHED` es un cierre enclavado. El modelo no vuelve a abrir una válvula
solo porque la lectura baje. La pantalla no tiene un botón para abrir válvulas
ni para enviar órdenes a actuadores reales. Pulsar `NORMAL` inicia otra corrida
desde el estado inicial; no rearma la corrida que ya terminó.

La escena 3D muestra el estado de la simulación, pero no calcula una nube de
gas ni una dispersión física por las habitaciones.

## Otros escenarios

- `NORMAL`: funcionamiento estable.
- `ROTURA LIVING`: perturbación de la rama living; revisa presión y evento.
- `CAÍDA SIN GAS`: caída de presión sin gas; sirve para comparar una anomalía.
- `FALSO PICO`: perturbación breve de presión.
- `FALLO PRESIÓN`: fallo simulado de presión.
- `FALLO GAS Z3`: sensor Z3 inválido; el sistema entra en `FAULT` y cierra las
  válvulas como respuesta segura.
- `FULL DEMO`: secuencia de varios estímulos.

## Si algo parece detenido

- Espera mientras indique `CALCULANDO` o `REPRODUCIENDO RESULTADOS`.
- Si la sesión dice `DESCONECTADO`, informa al operador que debe reconectar
  MATLAB.
- Si la escena no muestra sensores, cambia a `SEGURIDAD`, `PRESIÓN` o
  `TUBERÍAS` y elige una cámara de zona.
- Si la pantalla conserva el último resultado, revisa el estado de sesión:
  conservar datos anteriores no significa que haya telemetría nueva.

## Alcance

Este simulador es una herramienta de demostración y validación local. Sus
fugas, sensores, presiones y válvulas son modelados por software. No está
conectado a una instalación de gas real, no detecta una fuga real y no debe
usarse como sustituto de un sistema certificado ni de un procedimiento de
emergencia.
