# Reglas del proyecto SIGAS-RT

## Alcance del trabajo

Este proyecto corresponde únicamente al sistema SIGAS-RT.

Codex debe trabajar exclusivamente dentro de esta carpeta.

No modificar archivos fuera del directorio del proyecto.

## Restricciones

No crear ni modificar:

- páginas web externas.
- aplicaciones móviles.
- bases de datos.
- servidores.
- configuraciones del sistema operativo.

El proyecto está enfocado en:

- ESP32.
- C/C++.
- FreeRTOS.
- PlatformIO.
- Wokwi.

## Arquitectura obligatoria

Mantener siempre la arquitectura:

Sensor
↓
ADC
↓
CPU
↓
Procesamiento tiempo real
↓
Actuador

## Antes de modificar archivos

Explicar:

1. Qué archivo será modificado.
2. Qué cambio se realizará.
3. Por qué es necesario.

No realizar cambios destructivos sin confirmación.

## Organización

Respetar:

src/
include/
lib/
test/
docs/
simulation/

## Objetivo actual

Preparar y mantener el entorno de desarrollo.

No comenzar todavía la implementación del detector de gas.