# Bridge Wokwi-Godot

Bridge local en Python 3 para ejecutar escenarios Wokwi permitidos y reenviar telemetria estructurada al proyecto Godot.

## Reglas de seguridad

- Lee `WOKWI_CLI_TOKEN` desde el entorno del proceso.
- No imprime ni persiste tokens.
- No guarda secretos en archivos.
- Solo acepta comandos de escenario declarados en `visualization/scenarios/scenario_catalog.json`.
- Rechaza comandos directos de actuador.

## Ejecucion prevista

```powershell
python visualization\bridge\sigas_bridge.py --catalog visualization\scenarios\scenario_catalog.json
```
