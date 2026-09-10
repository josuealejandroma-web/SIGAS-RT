param(
  [switch]$SkipWokwi,
  [switch]$SkipGodot,
  [switch]$SkipTiming,
  [switch]$SkipBlender
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
$WokwiStatus = "PASS"
$TimingStatus = "PASS"
$GodotStatus = "PASS"
$BlenderStatus = "PASS"

if ($SkipWokwi) {
  $WokwiStatus = "SKIPPED"
  $TimingStatus = "SKIPPED"
}
if ($SkipTiming) {
  $TimingStatus = "SKIPPED"
}
if ($SkipGodot) {
  $GodotStatus = "SKIPPED"
}
if ($SkipBlender) {
  $BlenderStatus = "SKIPPED"
}

function Invoke-Step($Name, [scriptblock]$Step) {
  Write-Host "==> $Name"
  & $Step
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo: $Name"
  }
}

function Resolve-GodotCommand() {
  $localGodot = Join-Path $RepoRoot "tools\godot\godot.cmd"
  if (Test-Path $localGodot) {
    return $localGodot
  }
  $pathGodot = Get-Command godot -ErrorAction SilentlyContinue
  if ($null -ne $pathGodot) {
    return $pathGodot.Source
  }
  return ""
}

function Resolve-BlenderCommand() {
  $pathBlender = Get-Command blender -ErrorAction SilentlyContinue
  if ($null -ne $pathBlender) {
    return $pathBlender.Source
  }
  $candidates = @(
    "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  return ""
}

Invoke-Step "Python bridge tests" {
  python -m unittest discover visualization\bridge\tests
}

Invoke-Step "Observed execution-time summary tests" {
  python -m unittest discover simulation\tests
}

Invoke-Step "Observed execution-time summary consistency" {
  python simulation\generate_wcet_summary.py --check
}

Invoke-Step "Critical fail-safe host tests" {
  powershell -ExecutionPolicy Bypass -File scripts\verify_fail_safe.ps1
}

if (-not $SkipBlender) {
  $blender = Resolve-BlenderCommand
  if ([string]::IsNullOrWhiteSpace($blender)) {
    throw "Blender no esta disponible."
  }
  Invoke-Step "Blender bpy check" {
    & $blender --background --factory-startup --python-expr "import bpy; print('BPy smoke: OK ' + bpy.app.version_string)"
  }
  Invoke-Step "Blender scene validation" {
    & $blender --background visualization\blender\source\sigas_house.blend --python visualization\blender\scripts\validate_scene.py
  }
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

Invoke-Step "PlatformIO artifact selection sequence" {
  python scripts\verify_artifact_selection.py
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

  Invoke-Step "Prepare Wokwi visualization artifacts" {
    python visualization\bridge\firmware_artifacts.py --repo-root $RepoRoot --simulation-dir simulation --environment esp32doit-devkit-v1-visualization
  }
  Invoke-Step "Wokwi visual safe telemetry" {
    Push-Location simulation
    try {
      ..\tools\wokwi-cli.exe --timeout 12000 --scenario visual_safe_test.yaml --serial-log-file wokwi-serial-visual-safe.log .
    } finally {
      Pop-Location
    }
  }

  if (-not $SkipTiming) {
    Invoke-Step "Timing measurements" {
      powershell -ExecutionPolicy Bypass -File simulation\run_timing_measurements.ps1 -Runs 20 -LoadRuns 5 -TimeoutMs 30000
    }
  }

  Invoke-Step "Rebuild firmware normal after Wokwi visual test" {
    .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1 -t clean
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
    .\.venv\Scripts\platformio.exe run -e esp32doit-devkit-v1
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
    python visualization\bridge\firmware_artifacts.py --repo-root $RepoRoot --simulation-dir simulation --environment esp32doit-devkit-v1
  }
}

if (-not $SkipGodot) {
  $godot = Resolve-GodotCommand
  if ([string]::IsNullOrWhiteSpace($godot)) {
    throw "Godot no esta disponible en tools\godot ni en PATH."
  } else {
    Invoke-Step "Godot project check" {
      & $godot --headless --path visualization\godot --quit
    }
    Invoke-Step "Godot visual self test" {
      & $godot --headless --path visualization\godot --script res://scripts/VisualSelfTest.gd
    }
    Invoke-Step "Godot free walk self test" {
      & $godot --headless --path visualization\godot --script res://scripts/FreeWalkSelfTest.gd
    }
  }
}

Invoke-Step "Git whitespace check" {
  git diff --check
}

Invoke-Step "Secret scan" {
  $secretPattern = "wok_[A-Za-z0-9]|WOKWI_CLI_TOKE[N]\s*[=]|TOKE[N]=|SECRE[T]=|PASSWOR[D]="
  rg -n $secretPattern . -g "!.pio/**" -g "!tools/**" -g "!.venv/**" -g "!simulation/*.log"
  if ($LASTEXITCODE -eq 0) {
    throw "Secret scan found matches."
  }
  if ($LASTEXITCODE -eq 1) {
    $global:LASTEXITCODE = 0
  }
}

Write-Host "CORE EMBEDDED: PASS"
Write-Host "WOKWI: $WokwiStatus"
Write-Host "TIMING: $TimingStatus"
Write-Host "BRIDGE: PASS"
Write-Host "BLENDER: $BlenderStatus"
Write-Host "GODOT: $GodotStatus"
Write-Host "SECRETS: PASS"
Write-Host "verify_all: OK"
