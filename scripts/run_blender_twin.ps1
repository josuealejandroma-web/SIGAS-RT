param(
  [string]$BlenderCommand = "",
  [int]$BridgeTimeoutMs = 45000
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot
$PythonCommand = Get-Command python -ErrorAction Stop
$PlatformIO = Join-Path $RepoRoot ".venv\Scripts\platformio.exe"
$WokwiCli = Join-Path $RepoRoot "tools\wokwi-cli.exe"
foreach ($required in @($PlatformIO, $WokwiCli)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Falta una herramienta requerida: $required"
  }
}
if ([string]::IsNullOrWhiteSpace($BlenderCommand)) {
  $found = Get-Command blender -ErrorAction SilentlyContinue
  if ($null -ne $found) {
    $BlenderCommand = $found.Source
  } else {
    $BlenderCommand = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
  }
}
if (-not (Test-Path -LiteralPath $BlenderCommand -PathType Leaf)) {
  throw "Blender no esta disponible; usar -BlenderCommand con su ejecutable."
}
$token = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "Process")
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "User")
}
if ([string]::IsNullOrWhiteSpace($token)) { throw "WOKWI_CLI_TOKEN no configurado" }
[Environment]::SetEnvironmentVariable("WOKWI_CLI_TOKEN", $token, "Process")
Write-Host "WOKWI_CLI_TOKEN: configurado"
& $PlatformIO run -e esp32doit-devkit-v1-visualization
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $PythonCommand.Source visualization\blender\live\launcher.py --blender $BlenderCommand --timeout-ms $BridgeTimeoutMs
exit $LASTEXITCODE

