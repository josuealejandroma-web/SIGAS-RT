<#
.SYNOPSIS
    Gemelo local. El puente mantiene una sesión MATLAB hasta que el usuario la cierre.
#>
param(
    [string]$Scenario = 'NORMAL',
    [ValidateRange(1,60)][double]$StopTime = 8,
    [ValidateRange(0.1,4)][double]$PlaybackRate = 1,
    [switch]$KeepAlive,
    [switch]$SkipBrowser,
    [switch]$SkipMatlab
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot 'web-digital-twin'
$nodePath = Join-Path $repoRoot 'tools\node\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path -LiteralPath (Join-Path $webDir 'node_modules'))) { throw 'Instala dependencias con npm ci en web-digital-twin.' }
foreach ($port in @(5173,45811)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "El puerto $port está ocupado. Cierra el lanzador anterior o usa la sesión ya abierta."
    }
}
$env:VITE_FORCE_SOURCE = 'MATLAB_SIM'
$env:VITE_WS_URL = 'ws://127.0.0.1:45811'
$env:MATLAB_AUTOSTART = if ($SkipMatlab) { '0' } else { '1' }
$env:MATLAB_INITIAL_SCENARIO = $Scenario -replace '^V2_', ''
$env:MATLAB_STOP_TIME = $StopTime.ToString([Globalization.CultureInfo]::InvariantCulture)
$env:MATLAB_PLAYBACK_RATE = $PlaybackRate.ToString([Globalization.CultureInfo]::InvariantCulture)
# KeepAlive is accepted for compatibility; persistent sessions are now the default.
$bridgeTask = $null
$viteTask = $null
try {
    $bridgeTask = Start-Process $nodePath -ArgumentList @('--import','./node_modules/tsx/dist/loader.mjs','src/bridge/server.ts') -WorkingDirectory $webDir -WindowStyle Hidden -PassThru
    $viteTask = Start-Process $nodePath -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort') -WorkingDirectory $webDir -WindowStyle Hidden -PassThru
    Write-Host 'Web: http://127.0.0.1:5173. MATLAB se inicia una sola vez; usa los botones para ejecutar escenarios.'
    if (-not $SkipBrowser) { Start-Process 'http://127.0.0.1:5173' }
    Write-Host 'Deja esta terminal abierta. Ctrl+C cierra los procesos de esta sesión.'
    while (-not $bridgeTask.HasExited -and -not $viteTask.HasExited) { Start-Sleep -Seconds 1 }
} finally {
    # Stop only MATLAB children owned by this exact bridge process.
    if ($bridgeTask) {
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $($bridgeTask.Id)" |
            Where-Object { $_.Name -eq 'MATLAB.exe' } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
        if (-not $bridgeTask.HasExited) { Stop-Process -Id $bridgeTask.Id -ErrorAction SilentlyContinue }
    }
    if ($viteTask -and -not $viteTask.HasExited) { Stop-Process -Id $viteTask.Id -ErrorAction SilentlyContinue }
}
