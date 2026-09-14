# Tareas y esperas V2 (diseno)

Se propone una adquisicion periodica unica, presion cada50ms y gas cada segunda
activacion(100ms). Evita arbitrar dos lectores del hardware; conserva timestamps
y secuencias independientes para que la misma muestra gas no confirme dos veces.

| Task | Prioridad | Activacion | Periodo | Deadline academico | Bloqueo/queue wait | Observed min/avg/max |
| --- | ---: | --- | --- | --- | --- | --- |
| Acquisition | 3 | Periodica | 50ms; gas100ms | Terminar antes siguiente periodo50ms | I2C timeout5ms/nodo, max5 nodos; vTaskDelayUntil residual | PENDIENTE |
| Safety | 4 | Cola + watchdog | No periodica | RT post-confirmacion500ms | Recepcion max25ms; envio sin espera | PENDIENTE |
| Actuator | 5 | Cola + watchdog | No periodica | RT post-confirmacion500ms | Recepcion max200ms; timeout cierra | PENDIENTE |
| Diagnostics | 1 | Periodica | 500ms | Blando, sin garantia de seguridad | Colas no bloqueantes; UART puede bloquear | PENDIENTE |

Una sola tarea normal escribe actuadores; boot tiene excepcion previa a habilitar
runtime. Todas las tareas esperan compuerta hasta completar recursos.
Colas latest-value para muestra/comando/estado; eventos timing separados para
no perder cierres entre dos snapshots. Overwrite requiere detectar gaps y
preservar enclavamiento; fallo de entrega no puede permitir reapertura.

No Serial desde ruta critica. Solo Diagnostics formatea registros completos;
interferencia de formato/transmision sigue siendo medible, no despreciada.
Medir por separado wall elapsed de cuerpo, espera cola, retraso periodico y
tiempos I2C. El cuerpo puede incluir preempcion: no equivale a CPU puro ni WCET.
Carga diagnostica de ensayo acotada no es busy-wait temporal de operacion.
