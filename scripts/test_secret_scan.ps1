$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Scanner = Join-Path $PSScriptRoot "secret_scan.ps1"
$Fixture = Join-Path $RepoRoot ".secret-scan-fixture.txt"
$Candidate = "wok_" + ("A" * 32)

try {
  [System.IO.File]::WriteAllText($Fixture, "credential=$Candidate`n")
  $redactedOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $Scanner -Path $Fixture 2>&1 | Out-String
  $redactedExitCode = $LASTEXITCODE

  if ($redactedExitCode -ne 1) {
    throw "El fixture controlado no fue detectado."
  }
  if ($redactedOutput.Contains($Candidate)) {
    throw "El escaner revelo el contenido detectado."
  }
  if (-not $redactedOutput.Contains("pattern=Wokwi token") -or -not $redactedOutput.Contains("location=line 1")) {
    throw "El reporte redacted no contiene patron y ubicacion."
  }
} finally {
  Remove-Item -LiteralPath $Fixture -Force -ErrorAction SilentlyContinue
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $Scanner
if ($LASTEXITCODE -ne 0) {
  throw "El repositorio no supera el escaneo de secretos."
}

Write-Host "SECRET_SCAN_SELF_TEST: PASS"
