# Limitaciones y barreras

- Prototipo academico; no instalar servos/MQ2 como sistema domestico certificado.
- No instrucciones de montaje/perforacion ni liberar gas para pruebas.
- ADC no es ppm fisico; simulated_ppm no es medicion real.
- Presiones deterministas, no CFD ni dinamica acoplada del gas.
- P1 compartido no mide exclusivamente caida en cada cuerpo de valvula.
- Actuacion ordenada no es feedback mecanico; atasco fisico no verificable.
- MQ2 constante plausible puede ser gas estable o sensor stuck: indistinguible
  sin referencia/diagnostico adicional. No ocultar esta limitacion.
- Protocolo I2C academico no implementa metrologia/certificacion de un fabricante.
- Un bus compartido introduce fallo comun; perdida critica exige cierre maestro.
- Normativa oficial consultada no equivale a dictamen de vigencia/aplicabilidad.
- Wokwi verifica software simulado, no Hard Real-Time fisico.
- Los maximos de muestras no son WCET/WCRT formal.
- V1 y V2 son evidencias distintas, con commits/hashes/entornos propios.
- Desarrollo V2 en curso: no usar documentos de diseno como validacion final.
