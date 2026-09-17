$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildDir = Join-Path $RepoRoot ".pio\v2-host"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
$Source = Join-Path $RepoRoot "test\v2_safety_tests.cpp"
$IncludeDir = Join-Path $RepoRoot "include"
$Executable = Join-Path $BuildDir "v2_safety_tests.exe"
$Compiler = Get-Command c++ -ErrorAction SilentlyContinue
if ($null -ne $Compiler) {
  & $Compiler.Source -std=c++17 -Wall -Wextra -Werror "-I$IncludeDir" $Source -o $Executable
  if ($LASTEXITCODE -ne 0) { throw "V2 host build failed" }
  & $Executable
} else {
  $VsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path -LiteralPath $VsWhere)) { throw "C++ host compiler unavailable" }
  $InstallPath = & $VsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  $VcVars = Join-Path $InstallPath "VC\Auxiliary\Build\vcvars64.bat"
  $ObjectFile = Join-Path $BuildDir "v2_safety_tests.obj"
  $Command = "call `"$VcVars`" >nul && cl.exe /nologo /std:c++17 /EHsc /W4 /WX /I`"$IncludeDir`" `"$Source`" /Fo:`"$ObjectFile`" /Fe:`"$Executable`" && `"$Executable`""
  & $env:ComSpec /d /s /c $Command
}
if ($LASTEXITCODE -ne 0) { throw "V2 host verification failed" }
