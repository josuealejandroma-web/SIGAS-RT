# Circuito Wokwi SIGAS-RT

## 1. Objetivo del circuito

Validar el hardware virtual de la Fase 2 antes de implementar la logica critica de deteccion. El circuito demuestra la ruta:

```text
MUNDO FISICO -> SENSOR -> SENAL ANALOGICA -> ADC -> ESP32 -> SALIDA DIGITAL/PWM -> ACTUADOR -> MUNDO FISICO
```

Este bloque es un hardware smoke test. No implementa umbrales definitivos, maquina de estados final, filtrado, histeresis, deadline definitivo ni cierre automatico fail-safe.

## 2. Lista de componentes

| Componente | Identificador Wokwi | ID en `diagram.json` |
| --- | --- | --- |
| ESP32 DOIT DevKit V1 | `wokwi-esp32-devkit-v1` | `esp` |
| Sensor MQ-2 Zona 1 | `wokwi-gas-sensor` | `mq2z1` |
| Sensor MQ-2 Zona 2 | `wokwi-gas-sensor` | `mq2z2` |
| Estimulo ADC Zona 1 | `wokwi-slide-potentiometer` | `adcStimZ1` |
| Estimulo ADC Zona 2 | `wokwi-slide-potentiometer` | `adcStimZ2` |
| Servomotor | `wokwi-servo` | `valveServo` |
| Buzzer | `wokwi-buzzer` | `buzzer1` |
| LED verde | `wokwi-led` | `ledGreen` |
| LED rojo | `wokwi-led` | `ledRed` |
| Resistencias LED | `wokwi-resistor` | `rGreen`, `rRed` |
| Boton de rearme | `wokwi-pushbutton` | `resetBtn` |

Los identificadores se verificaron contra documentacion de Wokwi y con `wokwi-cli lint`.

## 3. Funcion de cada componente

| Componente | Funcion |
| --- | --- |
| MQ-2 Zona 1 | Sensor analogico simulado de cocina. |
| MQ-2 Zona 2 | Sensor analogico simulado de calefon, tuberia o area tecnica. |
| Estimulos ADC | Fuentes analogicas controlables solo para automatizar tres niveles ADC por zona en Wokwi CLI. |
| ESP32 | CPU y ADC del prototipo. |
| Servo | Representacion academica de valvula abierta/cerrada. |
| Buzzer | Alarma sonora simulada. |
| LED verde | Indicador visual de estado no alarmado durante smoke test. |
| LED rojo | Indicador visual de estado alarmado durante smoke test. |
| Boton | Entrada digital para detectar accion de rearme, sin logica final de rearme. |

## 4. Pinout completo

| Funcion | GPIO | Pin Wokwi | Tipo |
| --- | --- | --- | --- |
| MQ-2 Zona 1 AO/AOUT | GPIO34 | `D34` | ADC1 entrada analogica |
| MQ-2 Zona 2 AO/AOUT | GPIO35 | `D35` | ADC1 entrada analogica |
| Estimulo ADC Zona 1 SIG | GPIO34 | `D34` | Entrada analogica de prueba automatizada |
| Estimulo ADC Zona 2 SIG | GPIO35 | `D35` | Entrada analogica de prueba automatizada |
| Servo valvula | GPIO18 | `D18` | PWM |
| Buzzer | GPIO19 | `D19` | Salida digital/PWM |
| LED verde | GPIO21 | `D21` | Salida digital |
| LED rojo | GPIO22 | `D22` | Salida digital |
| Boton rearme | GPIO23 | `D23` | Entrada digital con `INPUT_PULLUP` |
| UART0 TX/RX | TX0/RX0 | `TX0`/`RX0` | Serial Monitor |

GPIO34 y GPIO35 se usan solo como entradas ADC. No se usan como salidas.

Los MQ-2 virtuales se alimentan desde `3V3` en la simulacion para mantener `AOUT` dentro del rango de lectura del ADC del ESP32. Esta decision evita saturar el ADC durante el smoke test; no representa una recomendacion de conexion para hardware real.

## 5. Diagrama Sensor -> ADC -> CPU -> Actuador

```text
MQ-2 Zona 1 AO ----+
                  +--> GPIO34 / ADC1 --+
Estimulo ADC Z1 --+                    |
                                       v
                                     ESP32
                                       |
MQ-2 Zona 2 AO ----+                    |
                  +--> GPIO35 / ADC1 --+
Estimulo ADC Z2 --+                    |
                                       |
                      +----------------+----------------+
                      |                |                |
                      v                v                v
               Servo valvula        Buzzer        LED verde/rojo
```

Los estimulos ADC son un recurso de validacion automatizada en Wokwi, no un componente del hardware real objetivo.

## 6. Entradas analogicas

Los sensores MQ-2 usan la salida analogica, documentada conceptualmente como `AO`; en el componente validado por `wokwi-cli lint`, el pin aceptado por la CLI es `AOUT`. La salida digital `DOUT` no se usa como fuente principal de deteccion.

El firmware usa `analogRead()` sobre GPIO34 y GPIO35. Los valores registrados son `ADC_RAW` de 12 bits. Corresponden a la simulacion y no representan una medicion certificada de concentracion de gas.

## 7. Entradas digitales

El boton de rearme esta conectado a GPIO23 con `INPUT_PULLUP`. En la prueba, `LOW` representa boton presionado y `HIGH` representa boton liberado.

## 8. Salidas digitales

- GPIO19 controla el buzzer con `tone()` / `noTone()`.
- GPIO21 controla LED verde.
- GPIO22 controla LED rojo.

## 9. Salida PWM

GPIO18 controla el servomotor:

| Nombre conceptual | Angulo de prueba |
| --- | --- |
| `VALVE_OPEN` | 20 grados |
| `VALVE_CLOSED` | 110 grados |

Estos angulos son solo posiciones diferenciadas de simulacion. No equivalen a una electrovalvula real.

## 10. Zona 1

Zona 1 representa cocina. El MQ-2 `mq2z1` entrega una senal analogica `AOUT` hacia GPIO34/ADC1. Para el escenario automatizado, `adcStimZ1` permite variar el nivel analogico observado en el mismo canal ADC.

## 11. Zona 2

Zona 2 representa calefon, tuberia o area tecnica. El MQ-2 `mq2z2` entrega una senal analogica `AOUT` hacia GPIO35/ADC1. Para el escenario automatizado, `adcStimZ2` permite variar el nivel analogico observado en el mismo canal ADC.

## 12. Procedimiento del hardware smoke test

Archivo de escenario:

```text
simulation/hardware_smoke_test.yaml
```

Comandos:

```powershell
.\.venv\Scripts\platformio run
cd simulation
..\tools\wokwi-cli.exe --timeout 30000 --scenario hardware_smoke_test.yaml --serial-log-file wokwi-serial.log .
```

El test verifica:

- arranque del ESP32;
- salida por Serial Monitor;
- lectura ADC de Zona 1 en GPIO34;
- lectura ADC de Zona 2 en GPIO35;
- niveles bajo, medio y alto por zona usando estimulos analogicos controlables;
- independencia entre canales ADC;
- movimiento de servo a abierto y cerrado;
- buzzer ON/OFF;
- LED verde;
- LED rojo;
- boton presionado y liberado.

Para ejecutar este modo con el firmware de integracion FreeRTOS, el escenario mantiene presionado `resetBtn` al arrancar. Si el boton no esta presionado al inicio, el firmware entra al modo de operacion FreeRTOS.

## 13. Resultados obtenidos

Resultados reales de la validacion Wokwi:

| Test | Resultado |
| --- | --- |
| TEST 1 MQ-2 Zona 1 / ADC1 | PASS: se registraron lecturas `ADC_RAW` para `MQ2-Z1` y tres niveles: 410 bajo, 2048 medio, 3686 alto. |
| TEST 2 MQ-2 Zona 2 / ADC1 | PASS: se registraron lecturas `ADC_RAW` para `MQ2-Z2` y tres niveles: 410 bajo, 2048 medio, 3686 alto. |
| TEST 3 independencia | PASS: al cambiar Zona 1, Zona 2 permanecio en 410; luego Zona 2 cambio a 2048 y 3686 de forma separada. |
| TEST 4 servo | PASS: se observaron mensajes `VALVE OPEN` y `VALVE CLOSED`. |
| TEST 5 buzzer | PASS: se observaron mensajes `BUZZER ON` y `BUZZER OFF`. |
| TEST 6 LED verde | PASS: se observo `LED-GREEN OK`. |
| TEST 7 LED rojo | PASS: se observo `LED-RED OK`. |
| TEST 8 boton | PASS: se observo `RESET PRESSED` y `RESET RELEASED`. |

El log serial generado localmente queda en `simulation/wokwi-serial.log` y no se versiona.

## 14. Limitaciones de Wokwi

Wokwi valida conectividad, arranque, Serial, ADC simulado y actuadores virtuales. No certifica comportamiento hard real-time ni seguridad de hardware real.

La documentacion de escenarios de Wokwi indica que `set-control` solo aplica a partes con controles automatizables. La lista documentada incluye potenciometros y botones, pero no incluye `wokwi-gas-sensor`. Por eso el escenario usa `wokwi-slide-potentiometer` como estimulo analogico controlable para validar tres niveles ADC por zona.

## 15. Limitaciones de MQ-2

El MQ-2 virtual representa comportamiento analogico simulado. En la version usada de Wokwi CLI, el atributo inicial `ppm` no produjo cambios automatizables confiables de `ADC_RAW` durante el escenario. En hardware real, un MQ requiere calentamiento, calibracion, consideraciones ambientales y validacion frente a normas aplicables. Este prototipo no convierte ADC a ppm certificados.

## 16. Limitaciones del servomotor como valvula

El servomotor representa exclusivamente una valvula simulada para fines academicos. No debe interpretarse como recomendacion para controlar o modificar una instalacion domiciliaria real de gas.
