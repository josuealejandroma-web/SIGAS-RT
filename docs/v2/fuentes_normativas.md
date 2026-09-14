# Fuentes y alcance normativo

Consulta web: 14 septiembre2026. Referencias APA7 adaptadas con enlaces.
Solo fuentes primarias. No constituye dictamen legal o certificacion.

## ANH: distinguir documentos y magnitudes

El indice oficial de distribucion por redes lista DS1996 y Anexo5 asociado a
0036/2016 y0001/2019. Se identifico texto2016 ANH/DS1996-A05 version2 y
texto2019 sobre multicapa. No se ha establecido exhaustivamente ausencia de
modificaciones posteriores: **vigencia consolidada pendiente de confirmacion**.
Los enlaces PDF fallaron en descarga completa; se consultaron pasajes indexados
del propio dominio ANH. No se afirma haber revisado todas sus paginas.

En el texto2016,34.1 limita presion unifamiliar a23mbar BP;34.3 distingue
comercial/calderas hasta0.4bar MPA. Tabla de34.4 contiene19mbar como presion
regulada y alternativas hasta23mbar. No son umbrales de deteccion intercambiables.
0.4bar=400mbar tampoco es la presion nominal elegida para este prototipo.
Las decisiones20/19mbar de ensayo son SIMULATION ASSUMPTION, no cumplimiento ANH.

1. Agencia Nacional de Hidrocarburos. (s.f.). *Normativa para distribucion de gas
   natural por redes*. Recuperado el14septiembre2026, de
   https://www.anh.gob.bo/w2019/contenido.php?D=1&R=66&s=41
2. Agencia Nacional de Hidrocarburos. (2016). *Anexo5: Instalaciones de categorias
   domestica y comercial de gas natural* (ANH/DS1996-A05,v2,0036/2016),34.1-34.4.
   https://www.anh.gob.bo/InsideFiles/Documentos/Documentos_Id-452-170302-0806-0.pdf
3. Agencia Nacional de Hidrocarburos. (2019). *Anexo5, ampliacion multicapa*
   (0001/2019; verificar denominacion UN/DJ en original antes de citar legalmente).
   https://www.anh.gob.bo/InsideFiles/Documentos/Documentos_Id-451-190219-0236-0.pdf

## Fabricantes y simulador

Winsen describe sensor semiconductorSnO2 no selectivo con calentador5V. La ficha
no acredita detector domiciliario certificado. Wokwi documenta AO/DO y estimulo
ppm; el tiempo de calentamiento del simulador no sustituye manual de fabricante.
Honeywell ofrece ABP2 en rangos de baja presion y varias interfaces; seleccionar
referencia concreta requiere estudiar medios/materiales y certificaciones.

4. Zhengzhou Winsen Electronics Technology. (s.f.). *MQ-2 semiconductor sensor
   for smoke and flammable gas*. https://www.winsen-sensor.com/product/mq-2.html
5. CodeMagic. (s.f.). *wokwi-gas-sensor reference*.
   https://docs.wokwi.com/parts/wokwi-gas-sensor
6. CodeMagic. (s.f.). *ESP32 simulation*.
   https://docs.wokwi.com/guides/esp32
7. CodeMagic. (s.f.). *Wokwi automation scenarios*.
   https://docs.wokwi.com/wokwi-ci/automation-scenarios
8. CodeMagic. (s.f.). *I2C device API*.
   https://docs.wokwi.com/chips-api/i2c
9. CodeMagic. (s.f.). *Compiling custom chips to WASM*.
   https://docs.wokwi.com/guides/custom-chips-to-wasm
10. Espressif Systems. (s.f.). *ESP32-WROOM-32 datasheet* (v3.7,NRND).
    https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html
11. Espressif Systems. (s.f.). *GPIO and RTC GPIO, ESP-IDF programming guide*.
    https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html
12. Honeywell. (s.f.). *Basic ABP2 series pressure sensors*.
    https://automation.honeywell.com/us/en/products/sensing-solutions/sensors/pressure-sensors/board-mount-pressure-amplified/basic-abp2-series-board-mount-pressure-sensor

Wokwi Automation esta en alpha y ChipsAPI en beta segun sus propias paginas.
Validar controles/circuito antes de lanzar campana; no presuponer soporte ppm
automatizado solo por existir atributo ppm interactivo.
