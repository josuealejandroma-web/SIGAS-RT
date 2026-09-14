# Sensores y variables

Pregunta: **Que tipo de sensor es? Que informacion esta mandando?**

| ID | Tipo/zona | Variable e interfaz | Unidad/dato CPU | Periodo | Rango simulado | Procesamiento/fallos/limites |
| --- | --- | --- | --- | --- | --- | --- |
| GS1 | MQ2 semiconductor, cocina | Salida analogica a ADC34 | gas_adc12bits, nivel | 100ms | ADC0..4095 | Histeresis y3 HIGH; freshness; no ppm calibrado |
| GS2 | MQ2 semiconductor, tecnica | AO a ADC35 | Igual GS1 | 100ms | Igual | Igual |
| GS3 | MQ2 semiconductor, living | AO a ADC32 | Igual GS1 | 100ms | Igual | Igual |
| P0 | Transductor virtual, entrada regulada | I2C0x30 | raw firmado centimbar + sequence + status | 50ms | 0..40mbar gauge | Rango, secuencia, edad, consistencia |
| P1 | Transductor virtual, manifold | I2C0x31 | Igual P0 | 50ms | Igual | Igual |
| PK | Transductor virtual, cocina | I2C0x32 | Igual P0 | 50ms | Igual | Igual |
| PT | Transductor virtual, tecnica | I2C0x33 | Igual P0 | 50ms | Igual | Igual |
| PL | Transductor virtual, living | I2C0x34 | Igual P0 | 50ms | Igual | Igual |

Presion propuesta: resolucion digital0.01mbar (no exactitud fisica); raw/100
es pressure_mbar_simulated. Conversion central y rechazo fuera de rango.
Todos los valores iniciales y umbrales son SIMULATION ASSUMPTION.
pressure_raw no es ADC del ESP32: representa conversion interna abstracta.

MQ2 real: material SnO2, conductividad dependiente de gases, sensible a varios
compuestos; necesita circuito/calibracion y calentador. No identifica metano
selectivamente ni certifica seguridad domestica. Ver fuentes Winsen y Wokwi.
El fabricante indica alimentacion de lazo/calefactor5V: la alimentacion3V3 del
modelo V1 no es recomendacion fisica. Nunca unir dos salidas analogicas reales.

`SIMULATED_PPM` solo se publica si se conoce el estimulo del escenario; la
CPU que solo lee ADC no debe inventar ese dato mediante conversion no validada.
Una lectura constante plausible no demuestra sensor sano ni sensor roto.
Fault injection de stuck/timeout verifica el contrato, no diagnostico fisico
completo de un MQ2 de solo AO.

Candidato futuro: familia Honeywell ABP2, opciones de baja presion e I2C/SPI o
analogicas. Debe seleccionarse referencia/rango/materiales precisos; disponer
de una opcion para gases secos NO prueba compatibilidad GN ni certificacion.
No se adopta el protocolo ABP2 para el custom chip: es un protocolo academico.
