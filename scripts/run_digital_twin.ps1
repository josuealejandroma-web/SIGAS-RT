param(
  [string]$GodotCommand = "",
  [int]$BridgeTimeoutMs = 30000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Test-Command($Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-GodotCommand() {
  if (-not [string]::IsNullOrWhiteSpace($GodotCommand)) {
    return $GodotCommand
  }
  $localGodot = Join-Path $RepoRoot "tools\godot\godot.cmd"
  if (Test-Path $localGodot) {
    return $localGodot
  }
  if (Test-Command "godot") {
    return "godot"
  }
  return ""
}

if (-not (Test-Command "python")) {
  throw "python no esta disponible en PATH."
}

if (-not (Test-Path ".\.venv\Scripts\platformio.exe")) {
  throw "PlatformIO no esta disponible en .\.venv\Scripts\platformio.exe."
}

if (-not (Test-Path ".\tools\wokwi-cli.exe")) {
  throw "Wokwi CLI no esta disponible en .\tools\wokwi-cli.exe."
}

$token = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "Process")
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "User")
  if (-not [string]::IsNullOrWhiteSpace($token)) {
    [Environment]::SetEnvironmentVariable("WOKWI_CLI_TOKEN", $token, "Process")
  }
}
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "WOKWI_CLI_TOKEN no esta configurado."
}
Write-Host "WOKWI_CLI_TOKEN: configurado"

.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization -t clean
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
.\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$ResolvedGodot = Resolve-GodotCommand
if ([string]::IsNullOrWhiteSpace($ResolvedGodot)) {
  Write-Warning "Godot no esta disponible en PATH. Inicia manualmente visualization\godot cuando instales Godot 4."
}

$bridgeArgs = @(
  "visualization\bridge\sigas_bridge.py",
  "--catalog", "visualization\scenarios\scenario_catalog.json",
  "--timeout-ms", "$BridgeTimeoutMs"
)

$bridge = Start-Process -FilePath "python" -ArgumentList $bridgeArgs -NoNewWindow -PassThru
try {
  if (-not [string]::IsNullOrWhiteSpace($ResolvedGodot)) {
    & $ResolvedGodot --path "visualization\godot"
  } else {
    Write-Host "Bridge iniciado. Usa UDP 127.0.0.1:45701/45702 para pruebas locales."
    Wait-Process -Id $bridge.Id
  }
} finally {
  if (-not $bridge.HasExited) {
    Stop-Process -Id $bridge.Id -Force
  }
}
