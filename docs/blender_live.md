# Decisiones del consumidor Blender LIVE

Base: `f332d150056d6186b039a81fccfee65c9203872f`.
Rama de desarrollo: `feature/blender-live-twin`.

## Contrato y concurrencia

Se reutilizan `telemetry_parser.parse_line`, el catalogo y el bridge existentes.
El adaptador de timing valida los mismos timestamps, resultado y diferencia
que el consumidor Godot. No agrega paquetes de estados ni comandos de actuacion.
UDP se limita a localhost: 45701 para recibir y 45702 para solicitar escenarios.

El receptor tiene un socket exclusivo, un worker daemon y una Queue de 128
datagramas. El timeout es de 100 ms. Al saturarse, descarta el mas antiguo;
no permite una cola de crecimiento ilimitado. Captura el reloj monotono al
recibir, para que un viewport lento no convierta datos viejos en LIVE.

El unico timer de produccion se ejecuta cada 50 ms, drena como maximo 128
datagramas, valida y modifica la escena desde el hilo principal. El worker solo
usa socket, queue, threading y time. El controlador rechaza llamadas desde otro
hilo. Los hooks de carga, guardado y cierre detienen la sesion; el bootstrap
desregistra la sesion anterior antes de crear una nueva.

## Escena y procesos

El maestro no se guarda ni se regenera. Materiales y animacion del handle se
restauran al detener; los materiales y las 16 particulas LIVE se eliminan.
La camara animada, navegacion y timeline son independientes del reloj de red.

El launcher usa un Windows Job con KILL_ON_JOB_CLOSE para los procesos que
inicia. Una compuerta stdin impide que el bridge cree hijos antes de estar
asignado al Job. Blender se abre interactivamente con preferencias temporales
de fabrica, carga el maestro y ejecuta el bootstrap. Los procesos ajenos no se
incluyen en el Job. El test de lifecycle comprueba padre, hijo y proceso ajeno.

## Limites de observacion

El bridge no confirma comandos mediante ACK. El panel informa envio o recepcion
observada sin declarar un proceso Wokwi iniciado a partir de un simple sendto.
Godot y Blender son alternativas en el mismo puerto, sin fanout ni duplicacion.

El contrato de estado periodico no conserva todas las transiciones efimeras:
SYSTEM_CRITICAL puede existir solo en los logs. Timeout Inicial puede completar
sin state porque no hubo una primera muestra. Los selftests locales cubren la
representacion de esos estados, pero no los inventan para la fuente LIVE.

Las fugas son conceptuales y la interpolacion del handle es visual. El RT-03
mostrado es el ultimo timing recibido, rotulado con su SEQ. La evidencia temporal
cerrada en `simulation/results/` permanece intacta. Replay usa la captura
historica y siempre se rotula RECORDED REPLAY.
