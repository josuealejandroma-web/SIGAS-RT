# Requisitos V2

Todos son academicos; no atribuidos a ANH salvo contexto documental citado.
Estado inicial de implementacion/verificacion: PENDIENTE.

| ID | Criterio verificable |
| --- | --- |
| V2-FR-01 | GS1 cocina, GS2 tecnica, GS3 living; ADC y nivel con ID inequívoco |
| V2-FR-02 | P0/P1/PK/PT/PL, raw y mbar simulados; invalido no se sustituye por cero valido |
| V2-FR-03 | VM/VK/VT/VL y sus nodos upstream/downstream; delta firmado o N/A |
| V2-FR-04 | Gas localizado confirmado cierra zona y enclava alarma |
| V2-FR-05 | PL anomalo persistente + gasGS3 confirmado identifica PIPE_RUPTURE living |
| V2-FR-06 | Caida aislada breve no enclava; perdida uniforme upstream no se etiqueta rotura |
| V2-FR-07 | Schema2 explicito; consumidores V1 no interpretan silenciosamente V2 |
| V2-FR-08 | Panel muestra tres zonas, cinco presiones, cuatro valvulas y fuente/freshness |
| V2-FR-09 | Tabla por habitacion y topologia V2 consistente con el modelo |
| V2-SR-01 | Arranque cerrado hasta muestras validas y seguras estables |
| V2-SR-02 | Multizona, incertidumbre grave, perdida sensor o perdida upstream: cierre maestro enclavado |
| V2-SR-03 | Ninguna reapertura automatica tras enclavamiento; rearme manual posterior a condiciones seguras estables |
| V2-SR-04 | Stale, duplicado, retroceso temporal y saltos no acumulan confirmaciones invalidas |
| V2-SR-05 | Solo Actuator escribe salidas en operacion; fallo de arranque conserva cerrado |
| V2-SR-06 | Falta de comandos dispara watchdog local de actuacion; no depender de Serial/Internet |
| V2-SR-07 | Anomalia persistente no localizable y persistencia upstream tras aislamiento escalan a VM |
| V2-SR-08 | Evidencia V1, Godot y maestro Blender V1 inmutables durante V2 |
| V2-RT-01 | Gas100ms, presion50ms, reloj monotono, esperas limitadas y medidas |
| V2-RT-02 | Deadline academico500000us desde confirmacion hasta recepcion actuador |
| V2-RT-03 | Registrar confirmacion gas/presion, decision, envio, recepcion, apply software por evento |
| V2-RT-04 | Medir min/promedio/max de todas las tareas y espera; no denominar WCET formal |
| V2-RT-05 | Campana nueva20+5 solo tras pruebas funcionales/fallos PASS, commit limpio y hashes |
