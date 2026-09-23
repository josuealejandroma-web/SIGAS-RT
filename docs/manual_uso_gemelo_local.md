# Manual de uso de SIGAS-RT: gemelo digital local

Versión del manual: 23 de septiembre de 2026.

## 1. Qué estás usando

La aplicación representa una casa y su red de gas en 3D. Permite ejecutar
escenarios de MATLAB/Simulink y observar sensores, presiones, caudales,
válvulas y alarmas. Funciona localmente en este equipo.

La fuente **MATLAB_SIM** significa que los datos proceden del modelo simulado.
**MOCK_SIM** significa demostración con datos sintéticos, sin MATLAB.
Ninguna de estas fuentes equivale a mediciones de una casa real.

MATLAB primero calcula cada escenario y después reproduce sus resultados.
La sesión permanece disponible entre pruebas, pero no realiza una medición
continua del entorno físico.

## 2. Abrir y cerrar el proyecto

Si ya está funcionando, abrir <http://127.0.0.1:5173/> en el navegador.
No iniciar una segunda copia del lanzador.

Para iniciarlo después de cerrar el proyecto, abrir PowerShell en la carpeta
del proyecto y ejecutar:

```powershell
cd "C:\Users\Mauri\Desktop\PROYECTO SIGAS-RT"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_matlab_web_twin.ps1 -Scenario NORMAL -StopTime 8 -PlaybackRate 1
```

Esperar a que MATLAB arranque y termine el escenario inicial. Mantener abierta
la terminal del lanzador. La duración indicada es tiempo simulado; el cálculo
puede tardar más en tiempo real. FULL DEMO utiliza 40 segundos simulados.

Para cerrar solo MATLAB, esperar a que termine el escenario y pulsar
**Cerrar sesión MATLAB**. Para volver a usarlo, pulsar **Conectar MATLAB**.
Para detener los procesos gestionados por el lanzador, usar **Ctrl+C** en su
terminal. Cerrar únicamente la pestaña no detiene MATLAB ni el lanzador.

## 3. Recorrer la casa

| Control | Uso |
| --- | --- |
| Arrastrar sobre la escena | Girar alrededor de la casa o zona seleccionada. |
| Rueda del ratón | Acercar o alejar la cámara. |
| Selector de cámara | Ir a EXTERIOR, COCINA, LIVING, AREA_TECNICA, MANIFOLD_MEDIDOR, VISTA_SUPERIOR o XRAY. |
| CASA | Ver el exterior de la casa original. |
| XRAY | Inspeccionar el interior y la instrumentación con elementos de la envolvente ocultos. |
| TUBERÍAS | Inspeccionar la red y las válvulas. |
| PRESIÓN | Ver etiquetas de presión y colores en los tramos. |
| SEGURIDAD | Inspeccionar los sensores de gas y su estado. |
| Etiqueta de sensor o válvula | Abrir su detalle cuando hay una muestra disponible. Cerrar con ✕. |

Los botones de escenario también seleccionan una vista y una cámara apropiadas.
Las pestañas de vistas, por sí solas, no ejecutan una nueva simulación.
En pantallas pequeñas, desplazarse hacia abajo para encontrar los paneles.

## 4. Ejecutar una prueba

1. Comprobar que la fuente es **MATLAB_SIM** y la sesión está conectada.
2. En **ESCENARIOS**, pulsar el caso deseado.
3. Esperar mientras aparece **CALCULANDO**. Los botones quedan bloqueados.
4. Durante **REPRODUCIENDO RESULTADOS**, observar el avance de **SIM TIME**,
   sensores, válvulas, indicadores, gráficas y línea de tiempo.
5. Al aparecer **SIMULACIÓN FINALIZADA**, revisar el resultado conservado.
6. Seleccionar otro escenario para comenzar una corrida nueva.

| Estado de sesión | Qué significa |
| --- | --- |
| INICIANDO MATLAB | El trabajador está arrancando; todavía no está listo. |
| LISTO | Puede recibir un escenario. |
| CALCULANDO | MATLAB está resolviendo el modelo; aún puede no haber datos. |
| REPRODUCIENDO RESULTADOS | Llegan las muestras calculadas del escenario. |
| CONECTADO · SIMULACIÓN FINALIZADA | La corrida terminó y MATLAB sigue disponible. No es una desconexión. |
| DESCONECTADO | La sesión o el puente local no están disponibles. |
| ERROR | Revisar el mensaje mostrado en el panel. |

Una muestra puede quedar antigua aunque la sesión siga conectada. El programa
conserva el resultado final; no inventa muestras nuevas para mantenerlo como LIVE.

## 5. Sensores, válvulas y unidades

| Identificador | Ubicación o función |
| --- | --- |
| GS1 / Z1 | Sensor de gas de cocina. |
| GS2 / Z2 | Sensor de gas del área técnica. |
| GS3 / Z3 | Sensor de gas del living. |
| VM | Válvula maestra, antes de las derivaciones. |
| VK | Válvula de cocina. |
| VT | Válvula del área técnica. |
| VL | Válvula del living. |
| P0 / P1 | Presión de entrada / presión después de la válvula maestra. |
| PK / PT / PL | Presión de cocina / área técnica / living. |

El panel **GAS SENSORS** muestra ADC, nivel y validez. El ADC no se convierte
a ppm: los umbrales son experimentales para simulación. El panel **PRESSURE**
usa mbar; **FLOW** usa kg/s. La diferencia de presión de una rama incluye
el tramo de tubería y no únicamente su válvula.

En las vistas de seguridad y válvulas, verde indica normal o abierta; rojo,
alarma o cerrada; violeta, sensor de gas inválido. En PRESIÓN, el color del
tubo representa presión en una escala de 0 a 30 mbar: rojo allí no significa
por sí solo una fuga.

**BUZZER**, **GREEN LED** y **RED LED** representan salidas del modelo.
BUZZER ON en pantalla no garantiza que el navegador emita un sonido.

## 6. ¿Tiene escenario de fuga? ¿Qué ocurre?

**Sí.** Hay fugas individuales en las tres zonas y una fuga multizona.
La respuesta del controlador MATLAB para estos estímulos es:

| Botón | Evento y respuesta prevista por el modelo |
| --- | --- |
| FUGA COCINA | GAS_LEAK en Z1; cierra VK. VM, VT y VL permanecen abiertas en este caso localizado. |
| FUGA TÉCNICA | GAS_LEAK en Z2; cierra VT. VM, VK y VL permanecen abiertas. |
| FUGA LIVING | GAS_LEAK en Z3; cierra VL. VM, VK y VT permanecen abiertas. |
| MULTIZONA | El estímulo eleva gas en cocina y living; registra MULTI_ZONE y cierra VM, VK, VT y VL. El modelo marca la afectación global. |

En las fugas individuales, el estímulo empieza en el segundo 1 del tiempo
simulado. El sensor modelado eleva su lectura y el controlador pasa por
advertencia y confirmación de nivel crítico. Después:

1. Registra el evento de fuga y la zona afectada.
2. Ordena cerrar la válvula correspondiente, o todas en multizona.
3. Activa buzzer y LED rojo; apaga el LED verde.
4. Pasa por **CRITICAL** y queda en **SAFE_LATCHED**.

**SAFE_LATCHED** significa que el cierre queda enclavado: no se abre la válvula
automáticamente porque baje una lectura. El modelo exige condiciones seguras
y una señal de rearme para salir de ese estado. La interfaz actual no ofrece
un botón de apertura directa ni un botón de rearme manual.

Pulsar **NORMAL** comienza una simulación independiente desde sus condiciones
iniciales; no repara una fuga ni rearma la corrida anterior.

El estímulo de gas es una entrada simulada. La escena 3D no calcula la
dispersión del gas por las habitaciones ni necesita mostrar una nube para
registrar una fuga. Comprobar el evento, la zona, el estado de las válvulas
y las alarmas del panel.

### Ejemplo: demostrar una fuga de cocina

1. Ejecutar **NORMAL** y esperar a que termine: comprobar las cuatro válvulas abiertas.
2. Pulsar **FUGA COCINA**. La cámara enfoca cocina y cambia a SEGURIDAD.
3. Esperar el cálculo y observar la reproducción.
4. Revisar **EVENT = GAS_LEAK**, zona Z1, **VK = CERRADA** y **SAFE_LATCHED**.
5. Revisar **BUZZER ON**, **RED LED ON** y **GREEN LED OFF**.
6. Seleccionar TUBERÍAS o PRESIÓN si se desea inspeccionar el resultado final.

En la prueba local previa se recibieron 205 tramas de esta fuga durante
8 segundos simulados y se comprobó el cierre de VK con las otras tres abiertas.

Al preparar este manual también se ejecutaron FUGA TÉCNICA, FUGA LIVING y
MULTIZONA, con 205 tramas cada una y estado final SAFE_LATCHED. Se verificó
respectivamente el cierre de VT, VL y las cuatro válvulas. Después se ejecutó
NORMAL, que terminó con 203 tramas y las cuatro válvulas abiertas.

## 7. Otros escenarios disponibles

| Botón | Qué permite observar |
| --- | --- |
| NORMAL | Arranque y funcionamiento estable. |
| ROTURA LIVING | Estímulos de gas y fuga física en la rama living. Limitación actual: puede clasificarse GAS_LEAK en lugar de PIPE_RUPTURE. |
| CAÍDA SIN GAS | Pérdida de presión de rama sin señal de gas. El controlador MATLAB actual entra en advertencia sin cerrar las válvulas; no representa pérdida de suministro. |
| FALSO PICO | Perturbación breve de la rama para explorar la respuesta transitoria. |
| FALLO PRESIÓN | Inyecta la señal de fallo del escenario; no reproduce por separado todos los modos físicos de fallo de un sensor. |
| FALLO GAS Z3 | Invalida el sensor Z3; el modelo entra en FAULT y cierra las cuatro válvulas. |
| FULL DEMO | Secuencia de estímulos, con pulsos de rearme internos. El enclavamiento puede impedir el rearme; no se fuerzan aperturas para completar la demostración. |

Los eventos de las gráficas y de la línea de tiempo corresponden a los
resultados recibidos. La existencia de un botón no certifica todos los casos
de fallo que podrían producirse en una instalación real.

## 8. Resolver problemas comunes

| Problema | Acción |
| --- | --- |
| La página no abre | Iniciar el lanzador y comprobar la URL local. |
| Puerto ocupado | Usar la sesión ya abierta; no iniciar varias copias. |
| MATLAB no disponible | Con el puente activo, pulsar Conectar MATLAB y esperar. Revisar el error si aparece. |
| Botones deshabilitados | Esperar si está iniciando, calculando o reproduciendo; comprobar la conexión. |
| SIMULACIÓN FINALIZADA | Es normal. Pulsar otro escenario para obtener resultados nuevos. |
| No hay datos tras recargar | Esperar la reconexión; si sigue vacío y la sesión está lista, ejecutar NORMAL. |
| No se ven sensores en CASA | Cambiar a SEGURIDAD, PRESIÓN o TUBERÍAS y elegir una cámara. |
| Escena lenta | Probar LOW en el selector de rendimiento. |
| Error de MATLAB | Consultar el mensaje y el registro `tools/web-matlab-<PID>/matlab.log`. |

## 9. Alcance de la respuesta de seguridad

Este manual describe el comportamiento del gemelo MATLAB local. No asegura
que una fuga real sea detectada o detenida: el navegador no está conectado
a sensores ni a válvulas de una instalación real en este modo.

La protección embebida pertenece al ESP32 y conserva su arquitectura:

```text
Sensor -> ADC -> CPU -> Procesamiento en tiempo real -> Actuador
```

La visualización es auxiliar. Puede solicitar escenarios permitidos, pero
no reemplaza la lógica crítica ni envía comandos directos a actuadores reales.
El tiempo de cálculo o reproducción en el navegador no mide el tiempo de
respuesta física del sistema ni certifica seguridad de una instalación.

## Referencias del proyecto

- [Validación local y arranque](validacion_gemelo_matlab_local.md).
- Estímulos: `matlab/scenarios/build_scenario_inputs.m`.
- Controlador: `matlab/models/controller/SIGAS_Controller.slx`, gráfico SafetyStateflow.
- Telemetría: `matlab/scripts/stream_simulation_to_web.m`.
- Interfaz: `web-digital-twin/src/ui/Panels.tsx`.
