<#
.SYNOPSIS
    Inicia el gemelo digital web con telemetria MATLAB local y unidireccional.
#>

param(
    [string]$Scenario = "V2_NORMAL",
    [double]$StopTime = 5,
    [double]$PlaybackRate = 1,
    [switch]$SkipBrowser,
    [switch]$SkipMatlab
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot "web-digital-twin"
$matlabScripts = Join-Path $repoRoot "matlab\scripts"
$children = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

function Start-ChildProcess {
    param([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory)
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru
    $children.Add($process)
    return $process
}

function Wait-TcpPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $client = [System.Net.Sockets.TcpClient]::new()
            $client.Connect("127.0.0.1", $Port)
            $client.Dispose()
            return
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    throw "Timeout esperando el puerto TCP $Port"
}

if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Push-Location $webDir
    try { & npm.cmd ci } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "npm ci fallo" }
}

$env:BRIDGE_BIND_HOST = "127.0.0.1"
$env:VITE_FORCE_SOURCE = "MATLAB_SIM"
$env:VITE_WS_URL = "ws://127.0.0.1:45811"

try {
    Write-Host "Iniciando bridge UDP 45810 -> WebSocket 45811..."
    $bridge = Start-ChildProcess "npm.cmd" @("run", "bridge") $webDir
    Wait-TcpPort 45811

    Write-Host "Iniciando web en http://127.0.0.1:5173..."
    $vite = Start-ChildProcess "npm.cmd" @("run", "dev", "--", "--host", "127.0.0.1") $webDir
    Wait-TcpPort 5173

    if (-not $SkipBrowser) {
        Start-Process "http://127.0.0.1:5173"
    }

    if (-not $SkipMatlab) {
        $matlab = Get-Command matlab -ErrorAction Stop
        $escapedRoot = $repoRoot.Replace("'", "''")
        $escapedScripts = $matlabScripts.Replace("'", "''")
        $escapedScenario = $Scenario.Replace("'", "''")
        $command = "cd('$escapedRoot'); addpath('$escapedScripts'); setup_project(); stream_simulation_to_web('$escapedScenario',$StopTime,$PlaybackRate);"
        $batchArgument = '"' + $command + '"'
        Write-Host "Iniciando MATLAB: $Scenario ($StopTime s, ${PlaybackRate}x)..."
        $matlabProcess = Start-ChildProcess $matlab.Source @("-batch", $batchArgument) $repoRoot
        $matlabProcess.WaitForExit()
        if ($matlabProcess.ExitCode -ne 0) {
            throw "MATLAB termino con codigo $($matlabProcess.ExitCode)"
        }
        Write-Host "Telemetria MATLAB completada correctamente."
    } else {
        Write-Host "Bridge y web listos; MATLAB omitido por -SkipMatlab."
    }

    Write-Host "Presiona Ctrl+C para cerrar bridge y web."
    while (-not $bridge.HasExited -and -not $vite.HasExited) {
        Start-Sleep -Seconds 1
    }
} finally {
    foreach ($process in $children) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
        }
    }
}
