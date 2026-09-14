# Arquitectura V2 propuesta

Ruta gas: MQ2 -> ADC1 -> adquisicion -> cola -> Safety -> cola -> Actuator.
Ruta presion: transductor digital simulado (ADC interno abstracto) -> I2C ->
adquisicion -> cola -> Safety. No se omite conversion, se aloja en el transductor.
Serial/bridge/Blender no toman decisiones de seguridad.

```text
Entrada regulada simulada -> P0 -> VM -> P1 -> manifold
                                          +-> VK -> PK -> Cocina GS1
                                          +-> VT -> PT -> Tecnica GS2
                                          +-> VL -> PL -> Living GS3
```

P0 NO representa la red de distribucion de varios bar. Es la entrada de baja
presion del prototipo. En V2 VM debe preceder TODAS las derivaciones.
Living tiene ramal de ensayo terminal sin aparato de gas inventado.

## Plan de pines sin conflictos (a validar en circuito V2)

| Senal | GPIO | Recurso/limitacion |
| --- | ---: | --- |
| GS1 | 34 | ADC1_CH6, entrada |
| GS2 | 35 | ADC1_CH7, entrada |
| GS3 | 32 | ADC1_CH4 |
| Presion SDA | 16 | I2C remapeado, modulo WROOM sin PSRAM |
| Presion SCL | 17 | I2C remapeado |
| VM | 18 | PWM, servo abstracto |
| VK | 25 | PWM, no usar DAC simultaneamente |
| VT | 26 | PWM |
| VL | 27 | PWM |
| Buzzer | 19 | PWM independiente |
| Verde/rojo | 21/22 | Conservados; NO usarlos tambien como I2C |
| Rearme | 23 | Entrada pull-up |
| UART0 | 1/3 | Serial, reservado |

No se usan GPIO6..11 flash, straps0/2/5/12/15, ni entradas34..39 como salida.
Tres ADC mas cinco presiones exceden los seis ADC1 expuestos habituales del
WROOM; I2C evita forzar pines inexistentes. Presiones en direcciones0x30..0x34.
El pinout no se extrapola a WROVER/PSRAM ni a otra placa sin auditoria.

## Separacion de versiones

Codigo V2 bajo include/v2 y src/v2, entornos con filtros explicitos.
Circuito/escenarios bajo simulation/v2; resultados nuevos results_v2.
Schema2 y prefijo serial separado. Blender V2 conserva el maestro V1 y aplica
una capa temporal adicional; no importa GLB a Blender ni cambia Godot.
