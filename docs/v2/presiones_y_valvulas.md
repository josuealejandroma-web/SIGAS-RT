# Presiones y valvulas

Pregunta: **Que presion recibe esta valvula?** En la demo sera una lectura
SIMULADA upstream, no un rating mecanico del servo.

| ID | Zona/funcion | Upstream | Downstream | DeltaP | Cierre | Rearme |
| --- | --- | --- | --- | --- | --- | --- |
| VM | Maestra de todos los ramales | P0 | P1 | P0-P1 | Multizona/fallo/suministro/anomalia grave | Manual, todas condiciones seguras |
| VK | Cocina | P1 | PK | P1-PK | Gas confirmadoGS1 | Igual |
| VT | Tecnica | P1 | PT | P1-PT | Gas confirmadoGS2 | Igual |
| VL | Living | P1 | PL | P1-PL | GasGS3/rotura correlacionada | Igual |

P1 compartido permite diferencia manifold-ramal, NO caida exclusiva en el cuerpo
de cada valvula. Incluye tuberia intermedia. UI debe mantener esa aclaracion.
Presion de nodo invalido/stale: N/A para delta, no cero artificial.

## Hipotesis de algoritmo (SIMULATION_ONLY)

Entrada20mbar y ramales19mbar como estado inicial de ensayo, no criterio ANH.
Presion baja12mbar, delta anomalo4mbar, caida20mbar/s, persistencia3 muestras.
No basta presion<threshold: evaluar diferencia/derivada/persistencia y gas.
Una caida corta aislada no enclava. Caida uniformeP0 baja distingue suministro
ausente. Caida localizada persistente sin gas es PRESSURE_ANOMALY, no rotura
confirmada. Incertidumbre prolongada exige cierre maestro conservador.
Caida localizada y gas confirmado es PIPE_RUPTURE (clasificacion simulada).

El cierre no recalcula presion mediante CFD. Escenarios controlan sensores de
forma determinista, incluso durante aislamiento. Presion residual downstream
puede ser legitima; no inferir fallo de valvula solo porque no llegue a cero.
Rearme exige restablecer condiciones seguras del escenario sin abrir para probar.
Una instalacion real necesitaria un procedimiento distinto validado por personal
autorizado; no es proporcionado aqui.
