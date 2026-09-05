# Escenarios visuales

Los escenarios visuales describen como representar pruebas ya existentes de Wokwi en el gemelo digital.

`scenario_catalog.json` define los comandos permitidos por el bridge. `visual_scenarios.json` agrega metadatos de presentacion: foco de camara, zonas afectadas y resultado esperado.

Ningun archivo de este directorio contiene comandos directos para abrir/cerrar valvula, activar buzzer o modificar LEDs. Esos estados provienen de la telemetria del firmware.
