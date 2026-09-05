param(
  [switch]$SkipWokwi,
  [switch]$SkipGodot
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Invoke-Step($Name, [scriptblock]$Step) {
  Write-Host "==> $Name"
  & $Step
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo: $Name"
  }
}

Invoke-Step "Python bridge tests" {
  python -m unittest discover visualization\bridge\tests
}

Invoke-Step "Build firmware normal" {
  .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1 -t clean
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
}

Invoke-Step "Build firmware visualizacion" {
  .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization -t clean
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1-visualization
}

if (-not $SkipWokwi) {
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

  New-Item -ItemType Directory -Force .pio\build\esp32doit-devkit-v1 | Out-Null
  Copy-Item .pio\build\esp32doit-devkit-v1-visualization\firmware.elf .pio\build\esp32doit-devkit-v1\firmware.elf -Force
  Invoke-Step "Wokwi visual safe telemetry" {
    Push-Location simulation
    try {
      ..\tools\wokwi-cli.exe --timeout 12000 --scenario visual_safe_test.yaml --serial-log-file wokwi-serial-visual-safe.log .
    } finally {
      Pop-Location
    }
  }

  Invoke-Step "Rebuild firmware normal after Wokwi visual test" {
    .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1 -t clean
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
    .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
  }
}

if (-not $SkipGodot) {
  $godot = Get-Command godot -ErrorAction SilentlyContinue
  if ($null -eq $godot) {
    Write-Warning "Godot no esta disponible en PATH; validacion headless omitida."
  } else {
    Invoke-Step "Godot project check" {
      godot --headless --path visualization\godot --quit
    }
  }
}

Invoke-Step "Git whitespace check" {
  git diff --check
}

Write-Host "verify_all: OK"
