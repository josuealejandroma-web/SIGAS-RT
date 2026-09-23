# Gemelo local MATLAB: uso y validacion

Revision local: 23 de septiembre de 2026. Esta evidencia corresponde a la
visualizacion y a los escenarios MATLAB; no es una nueva campana temporal ESP32/Wokwi.

## Arranque

Desde la raiz del proyecto, con las dependencias locales ya instaladas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_matlab_web_twin.ps1 -Scenario NORMAL -StopTime 8 -PlaybackRate 1
```

Abrir <http://127.0.0.1:5173>. Mantener la terminal del lanzador abierta.
Si informa que el puerto esta ocupado, usar la sesion existente o cerrar su
lanzador antes de iniciar otro. El bridge existente usa WebSocket 45811 y
UDP 45810, ambos en loopback. No se requieren servicios externos.

MATLAB R2026a permanece abierto entre escenarios. El lanzador usa Node local
en `tools/node` y acepta `MATLAB_EXE` si MATLAB esta instalado en otra ruta.
`Cerrar sesion MATLAB` termina el trabajador; `Conectar MATLAB` lo inicia otra vez.

## Uso y significado de los estados

1. Seleccionar un boton del panel ESCENARIOS para ejecutar un estimulo permitido.
2. CALCULANDO indica que Simulink esta resolviendo el modelo.
3. REPRODUCIENDO RESULTADOS indica que se transmiten sus muestras con tiempo simulado.
4. CONECTADO / SIMULACION FINALIZADA indica que MATLAB sigue disponible y el
   resultado final se conserva. Se puede ejecutar otro escenario sin reiniciar MATLAB.

Una sesion conectada no implica mediciones nuevas continuas. No se repite la
ultima muestra para simular frescura. La antiguedad de telemetria es independiente
del estado de la sesion. Si se edita el codigo durante el desarrollo y la recarga
en caliente reinicia el estado de la interfaz, recargar la pagina y ejecutar NORMAL.

La casa original se carga desde `sigas_house_original.glb`. Arrastrar gira la
camara y la rueda acerca o aleja. CASA muestra el exterior; las vistas de
inspeccion muestran la instrumentacion V2. Los estados de valvulas proceden
exclusivamente de la telemetria. Los botones envian escenarios, nunca ordenes
directas a actuadores. Se conserva la ruta critica embebida independiente:
Sensor -> ADC -> CPU -> Procesamiento tiempo real -> Actuador.

## Correcciones terminadas en esta continuacion

- Los botones de MATLAB ahora solicitan ejecutar el escenario, ademas de
  seleccionar su vista y camara. Antes solo cambiaban la vista.
- La cabecera puede ocupar varias filas y la columna 3D puede contraerse;
  el panel ya no queda recortado a 1280 px. Los escenarios adaptan sus columnas.
- Pruebas de interfaz comprueban el envio del escenario, bloqueo durante calculo
  y reproduccion, bloqueo sin sesion y aislamiento del simulador sintetico.

## Evidencia

- TypeScript sin errores, 58 pruebas aprobadas y build Vite correcto.
- Navegador: casa 3D visible, sin errores de consola observados. Sin desbordamiento
  horizontal a 1280 y 768 px; canvas de 920 x 563 y 760 x 352 px respectivamente.
- FUGA COCINA ejecutada desde la interfaz: 205 tramas, evento GAS_LEAK,
  cierre de VK con VM, VT y VL abiertas al final de los 8 s simulados.
- Integracion WebSocket con el trabajador MATLAB existente:
  GAS_SENSOR_FAILURE_Z3, 204 tramas, SENSOR_FAULT / FAULT y cuatro valvulas
  cerradas; despues NORMAL, 203 tramas, estado NORMAL y cuatro valvulas abiertas.
  Secuencias y tiempo simulado avanzaron; el caudal se transmitio en kg/s.
  NORMAL es una simulacion nueva, no un rearme de la corrida anterior.

```powershell
.\tools\node\node.exe scripts\test_matlab_web_bridge.mjs GAS_SENSOR_FAILURE_Z3 NORMAL
```

Los detalles de ejecucion y resultados permanecen en `tools/web-matlab-<PID>/`,
ignorado por Git. MATLAB emite advertencias sobre la deteccion del toolchain,
pero termino los escenarios comprobados. Vite advierte sobre el tamano del
paquete PlayCanvas y externalizacion de worker_threads; el build termino correctamente.
No se modificaron firmware, modelo fisico ni configuraciones del sistema.

La rotura de tuberia y FULL_DEMO conservan las limitaciones que muestra la interfaz:
esta validacion no afirma que todos los escenarios clasifiquen cada evento esperado.
