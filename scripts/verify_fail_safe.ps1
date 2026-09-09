$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildDir = Join-Path $RepoRoot ".pio\safe-fail-safe-tests"
$Source = Join-Path $RepoRoot "test\safe_fail_safe_tests.cpp"
$IncludeDir = Join-Path $RepoRoot "include"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

$MainSource = Get-Content -Raw -LiteralPath (Join-Path $RepoRoot "src\main.cpp")
if ($MainSource -match "\bdigitalRead\s*\(") {
  throw "SAFE-BOOT-01: main.cpp todavia selecciona modo con una entrada GPIO"
}
if ($MainSource -notmatch "configuredBootMode\s*\(") {
  throw "SAFE-BOOT-01: main.cpp no usa la seleccion explicita de compilacion"
}
Write-Host "SAFE-BOOT-01-SOURCE: PASS"

$RuntimeTaskFiles = @(
  "src\actuators.cpp",
  "src\diagnostics.cpp",
  "src\safety.cpp",
  "src\sensors.cpp"
)
foreach ($RelativePath in $RuntimeTaskFiles) {
  $TaskSource = Get-Content -Raw -LiteralPath (Join-Path $RepoRoot $RelativePath)
  if ($TaskSource -notmatch "waitForSystemRuntimeActivation\s*\(\s*\)\s*;") {
    throw "SAFE-BOOT-02: falta el bloqueo de activacion en $RelativePath"
  }
}
$SystemAppSource = Get-Content -Raw -LiteralPath `
  (Join-Path $RepoRoot "src\system_app.cpp")
if ($SystemAppSource -notmatch "bootGuard\.latchFailure\s*\(\s*\)" -or
    $SystemAppSource -notmatch "applyBootSafeActuatorState\s*\(\s*true\s*\)") {
  throw "SAFE-BOOT-02: el fallo de arranque no enclava y reaplica SAFE_CLOSE"
}
Write-Host "SAFE-BOOT-02-SOURCE: PASS"

function Invoke-GnuTest([string]$Compiler, [string]$Name,
                        [string[]]$Definitions) {
  $Executable = Join-Path $BuildDir ($Name + ".exe")
  $Arguments = @("-std=c++17", "-Wall", "-Wextra", "-Werror",
                 "-I$IncludeDir") + $Definitions + @($Source, "-o", $Executable)
  & $Compiler @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo compilar $Name"
  }
  & $Executable
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo $Name"
  }
}

function Resolve-VcVars() {
  $VsWhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path -LiteralPath $VsWhere)) {
    return ""
  }
  $InstallPath = & $VsWhere -latest -products * `
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    -property installationPath
  if ([string]::IsNullOrWhiteSpace($InstallPath)) {
    return ""
  }
  $Candidate = Join-Path $InstallPath "VC\Auxiliary\Build\vcvars64.bat"
  if (Test-Path -LiteralPath $Candidate) {
    return $Candidate
  }
  return ""
}

function Invoke-MsvcTest([string]$VcVars, [string]$Name,
                         [string[]]$Definitions) {
  $Executable = Join-Path $BuildDir ($Name + ".exe")
  $ObjectFile = Join-Path $BuildDir ($Name + ".obj")
  $DefinitionArgs = ($Definitions | ForEach-Object {
      "/D" + $_.Substring(2)
    }) -join " "
  $Command = "call `"$VcVars`" >nul && cl.exe /nologo /std:c++17 /EHsc /W4 /WX /I`"$IncludeDir`" $DefinitionArgs `"$Source`" /Fo:`"$ObjectFile`" /Fe:`"$Executable`" && `"$Executable`""
  & $env:ComSpec /d /s /c $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo $Name"
  }
}

$GnuCompiler = Get-Command c++ -ErrorAction SilentlyContinue
if ($null -ne $GnuCompiler) {
  Invoke-GnuTest $GnuCompiler.Source "normal" @()
  Invoke-GnuTest $GnuCompiler.Source "hardware-smoke" @(
    "-DSIGAS_RT_HARDWARE_SMOKE_TEST",
    "-DEXPECT_HARDWARE_SMOKE_MODE"
  )
  exit 0
}

$VcVars = Resolve-VcVars
if ([string]::IsNullOrWhiteSpace($VcVars)) {
  throw "No se encontro un compilador C++ host (c++ o MSVC Build Tools)."
}
Invoke-MsvcTest $VcVars "normal" @()
Invoke-MsvcTest $VcVars "hardware-smoke" @(
  "-DSIGAS_RT_HARDWARE_SMOKE_TEST",
  "-DEXPECT_HARDWARE_SMOKE_MODE"
)
