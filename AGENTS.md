# Reglas del proyecto SIGAS-RT

## Alcance del trabajo

Este proyecto corresponde únicamente al sistema SIGAS-RT.

Codex debe trabajar exclusivamente dentro de esta carpeta.

No modificar archivos fuera del directorio del proyecto.

## Restricciones

No crear ni modificar:

- páginas web externas.
- aplicaciones móviles.
- APK.
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

No depender de Internet para funciones críticas del sistema embebido.

Mantener separación entre:

- lógica crítica de detección/control en tiempo real.
- comunicación externa, simulación, documentación y herramientas auxiliares.

Documentar decisiones técnicas relevantes en `docs/`.

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
visualization/

## Objetivo actual

Preparar, validar y documentar el entorno de desarrollo, la simulacion Wokwi y el gemelo digital local.

El directorio `visualization/` es auxiliar. No debe contener logica critica de seguridad ni reemplazar la ruta embebida:

Sensor
↓
ADC
↓
CPU
↓
Procesamiento tiempo real
↓
Actuador

La visualizacion puede leer telemetria y ejecutar escenarios locales permitidos, pero no debe enviar comandos directos a actuadores criticos ni depender de Internet, bases de datos, servidores externos o servicios cloud.
