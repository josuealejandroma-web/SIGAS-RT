# Third-party notices

SIGAS-RT uses the following third-party tools or runtimes during development and simulation:

| Component | Purpose | Notes |
| --- | --- | --- |
| ESP32 Arduino core | ESP32 firmware framework | Installed by PlatformIO. |
| ESP32Servo | Servo control in Wokwi simulation | Declared in `platformio.ini`. |
| PlatformIO | Build system | Used locally and in CI. |
| Wokwi CLI | ESP32 simulation | Requires `WOKWI_CLI_TOKEN` from environment. |
| Godot 4 | Local digital twin visualization | Not bundled in this repository. |
| Python 3 | Local Wokwi-Godot bridge | Standard library only. |

No third-party binary, token or cloud credential is committed in this repository.
