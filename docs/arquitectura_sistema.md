# Arquitectura del sistema SIGAS-RT

## 1. Objetivo del sistema

SIGAS-RT es un prototipo academico simulado para detectar condiciones experimentales compatibles con una posible fuga de gas en dos zonas de una instalacion domiciliaria y ordenar una respuesta local de seguridad mediante ESP32, ADC, FreeRTOS y actuadores simulados.

El sistema sigue la arquitectura obligatoria:

```text
MUNDO FISICO
      |
      v
SENSOR
      |
      v
SENAL ANALOGICA
      |
      v
ADC
      |
      v
CPU / ESP32
      |
      v
PROCESAMIENTO DE TIEMPO REAL
      |
      v
DECISION DE SEGURIDAD
      |
      v
ACTUADOR
      |
      v
MUNDO FISICO
```

## 2. Alcance

La Fase 2 cubre una primera version funcional simulada:

- deteccion multizona;
- lectura analogica por ADC;
- confirmacion simple contra falsos positivos;
- maquina de estados de seguridad;
- cierre de valvula simulada;
- alarma sonora;
- indicadores visuales;
- rearme manual;
- medicion temporal de respuesta;
- pruebas mediante Wokwi CLI/MCP.

## 3. Limitaciones

Este proyecto no certifica deteccion real de gas ni reemplaza dispositivos certificados. Los sensores MQ y el servomotor se usan solamente como elementos de simulacion academica.

Restricciones:

- no pagina web;
- no APK;
- no aplicacion movil;
- no servidor;
- no base de datos;
- no MQTT;
- no Supabase;
- no Vercel;
- no servicios cloud para funciones criticas;
- no instrucciones para modificar instalaciones reales de gas.

El cumplimiento temporal obtenido mediante Wokwi corresponde al prototipo simulado y no constituye certificacion temporal de hardware real.

## 4. Componentes

Componentes logicos:

- Sensor Gas Zona 1: representa cocina.
- Sensor Gas Zona 2: representa calefon, tuberia o area tecnica.
- ADC ESP32: convierte la senal analogica AO a valor digital.
- CPU ESP32: ejecuta tareas FreeRTOS.
- TaskSafety: decide estados y confirma eventos.
- TaskActuator: aplica ordenes sobre valvula, buzzer e indicadores criticos.
- TaskIndicators: refleja estado visual no critico.
- TaskDiagnostics: registra mediciones por serial.

Componentes simulados:

- ESP32 DOIT DevKit V1.
- Dos sensores de gas analogicos soportados por Wokwi, preferentemente MQ-2 con salida AO si la simulacion lo permite.
- Servo como valvula simulada.
- Buzzer como alarma.
- LED verde.
- LED rojo.
- Boton de rearme.

## 5. Entradas

| Entrada | Tipo | Origen | Uso |
| --- | --- | --- | --- |
| Gas Zona 1 AO | Analogica | Sensor Zona 1 | Lectura ADC para evaluar cocina. |
| Gas Zona 2 AO | Analogica | Sensor Zona 2 | Lectura ADC para evaluar area tecnica. |
| Boton rearme | Digital | Usuario | Rearme explicito desde estado seguro bloqueado. |

Los valores ADC se tratan como unidades digitales crudas del prototipo. No equivalen a ppm certificados sin calibracion fisica real.

## 6. Salidas

| Salida | Tipo | Destino | Comportamiento |
| --- | --- | --- | --- |
| Servo valvula | PWM | Valvula simulada | Abierta en normal, cerrada en critico/bloqueado. |
| Buzzer | Digital/PWM | Alarma | Activo en critico/bloqueado. |
| LED verde | Digital | Indicador | Activo en normal. |
| LED rojo | Digital | Indicador | Activo en critico/bloqueado. |
| Serial | UART | Diagnostico | Valores ADC, estado, timestamps y resultado de pruebas. |

## 7. Flujo Sensor -> ADC -> CPU -> Actuador

```text
Sensor Gas Zona 1 ----+
                      |
                      +--> ADC1 ESP32 --> CPU / FreeRTOS --> TaskSafety
                      |                                      |
Sensor Gas Zona 2 ----+                                      v
                                                       Decision segura
                                                              |
                                      +-----------------------+----------------------+
                                      v                       v                      v
                                Servo valvula              Buzzer                LED rojo
```

La adquisicion debe mantener separacion entre lectura fisica, decision de seguridad y actuacion.

## 8. Flujo de emergencia

1. Una tarea de sensor lee el ADC y publica la muestra con timestamp.
2. `TaskSafety` evalua el valor filtrado/confirmado contra umbrales experimentales de simulacion.
3. Si hay condicion sospechosa, el sistema entra en `ESTADO_ADVERTENCIA`.
4. Si hay N muestras consecutivas sobre umbral, el sistema entra en `ESTADO_CRITICO`.
5. Al confirmar condicion critica, se registra `T_detect`.
6. La CPU emite una orden de cierre y registra `T_command`.
7. `TaskActuator` cierra la valvula simulada, activa buzzer, apaga LED verde y activa LED rojo.
8. El sistema pasa a `ESTADO_SEGURO_BLOQUEADO`.
9. Aunque el ADC vuelva a valores normales, la valvula permanece cerrada.
10. El rearme solo se acepta con boton explicito y sensores en condicion segura.

Filosofia fail-safe:

- ante condicion critica confirmada: alarma activa, estado critico visible y orden de cierre;
- ante incertidumbre grave de software: preferir estado seguro bloqueado;
- no reapertura automatica.

## 9. Arquitectura de software

Modulos previstos:

| Modulo | Responsabilidad |
| --- | --- |
| `include/config.h` | Pines, periodos, prioridades, umbrales experimentales y deadlines. |
| `include/sensors.h` / `src/sensors.cpp` | Lectura ADC y empaquetado de muestras por zona. |
| `include/safety.h` / `src/safety.cpp` | Estados, confirmacion, histeresis simple y medicion temporal. |
| `include/actuators.h` / `src/actuators.cpp` | Servo, buzzer, LED rojo, LED verde y boton de rearme. |
| `src/main.cpp` | Inicializacion, creacion de colas/eventos/tareas y orquestacion FreeRTOS. |

Estados minimos:

- `ESTADO_NORMAL`
- `ESTADO_ADVERTENCIA`
- `ESTADO_CRITICO`
- `ESTADO_SEGURO_BLOQUEADO`

Mecanismos FreeRTOS previstos:

- queues para muestras ADC;
- queue o task notification para comandos de actuacion;
- event group para banderas de estado;
- mutex solo si aparece un recurso compartido que lo requiera.

## 10. Arquitectura de hardware

Pinout propuesto para Fase 2:

| Funcion | GPIO ESP32 | Recurso |
| --- | --- | --- |
| Sensor Gas Zona 1 AO | GPIO34 | ADC1_CH6, solo entrada. |
| Sensor Gas Zona 2 AO | GPIO35 | ADC1_CH7, solo entrada. |
| Servo valvula simulada | GPIO18 | PWM. |
| Buzzer | GPIO19 | Salida digital/PWM. |
| LED verde | GPIO2 | Salida digital. |
| LED rojo | GPIO5 | Salida digital. |
| Boton rearme | GPIO4 | Entrada con pull-up. |
| Serial TX/RX | TX0/RX0 | Consola Wokwi CLI. |

Se proponen canales ADC1 para evitar conflictos conocidos de ADC2 con subsistemas de radio en ESP32. Aunque el prototipo no usa Wi-Fi, ADC1 conserva una arquitectura mas robusta para futuras restricciones locales.

## 11. Arquitectura temporal

| Elemento | Valor propuesto | Justificacion |
| --- | --- | --- |
| Periodo sensores | 100 ms | Muestras frecuentes sin saturar CPU. |
| Confirmacion | 3 muestras consecutivas | Rechaza picos aislados con latencia acotada. |
| Periodo seguridad | Evento/cola con timeout 50 ms | Respuesta rapida al llegar nuevas muestras. |
| Periodo actuador | Evento/cola inmediato | Ejecuta cierre al recibir comando. |
| Periodo indicadores | 250 ms | No critico. |
| Periodo diagnostico | 500 ms | No critico, evita saturar Serial. |
| Deadline prototipo | 500 ms | Desde `T_detect` hasta `T_command`. |

Con 3 muestras consecutivas a 100 ms, la confirmacion toma aproximadamente 300 ms desde el inicio de una fuga sostenida simulada. Esa latencia es anterior a `T_detect`. El requisito RT-03 mide desde confirmacion (`T_detect`) hasta orden al actuador (`T_command`), que debe mantenerse por debajo de 500 ms.
