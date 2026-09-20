<# 
.SYNOPSIS
    Launcher futuro para SIGAS-RT Web Digital Twin con MATLAB LIVE.

.DESCRIPTION
    Verifica bridge MATLAB, inicia Vite en modo MATLAB_SIM.
    Actualmente muestra "MATLAB LIVE TRANSPORT NOT ENABLED" hasta implementar emisor MATLAB.

.NOTES
    Requiere: Bridge Node.js corriendo (puertos 45810 UDP, 45811 WS)
    MATLAB: Simulink model con UDP sender block configurado
#>

param(
    [switch]$SkipBrowser,
    [switch]$Lan
)

$ErrorActionPreference = "Stop"

$Green  = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow
$Red    = [ConsoleColor]::Red
$Cyan   = [ConsoleColor]::Cyan
$Gray   = [ConsoleColor]::DarkGray

function Write-Color($msg, $color) {
    Write-Host $msg -ForegroundColor $color
}

function Write-Section($title) {
    Write-Host ""
    Write-Color "═══ $title ═══" $Cyan
}

Write-Section "SIGAS-RT WEB DIGITAL TWIN - MATLAB LIVE"

# Verificar bridge
$bridgeUrl = "ws://localhost:45811"
Write-Color "Verificando bridge MATLAB en $bridgeUrl..." $Yellow

try {
    # Test rápido de conexión WebSocket
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $cts.CancelAfter(2000)
    $ws.ConnectAsync($bridgeUrl, $cts.Token).Wait()
    $ws.Close()
    Write-Color "Bridge MATLAB: CONECTADO" $Green
    $bridgeReady = $true
} catch {
    Write-Color "Bridge MATLAB: NO DISPONIBLE" $Red
    Write-Color ""
    Write-Color "MATLAB LIVE TRANSPORT NOT ENABLED" $Red
    Write-Color ""
    Write-Color "Para habilitar MATLAB LIVE:" $Yellow
    Write-Color "  1. Iniciar bridge Node.js:" $Gray
    Write-Color "     cd web-digital-twin/bridge && npm run dev" $Gray
    Write-Color "  2. Configurar MATLAB UDP sender (puerto 45810)" $Gray
    Write-Color "  3. Verificar frames schema V2 en bridge logs" $Gray
    Write-Color ""
    $bridgeReady = $false
}

if (-not $bridgeReady) {
    Write-Color "Iniciando en modo MOCK_SIM como fallback..." $Yellow
    & "$PSScriptRoot\run_web_twin.ps1" @($SkipBrowser, $Lan)
    exit
}

# Si bridge está listo, iniciar Vite en modo MATLAB_SIM
$webDir = Join-Path $PSScriptRoot "..\web-digital-twin"
Set-Location $webDir

$vitePort = 5173
$host = if ($Lan) { "0.0.0.0" } else { "localhost" }
$viteUrl = "http://$host:$vitePort"

Write-Section "INICIANDO VITE (MATLAB_SIM MODE)"

$viteArgs = "run dev"
if ($Lan) { $viteArgs += " -- --host 0.0.0.0" }

# Set env var para forzar source MATLAB_SIM
$env:VITE_FORCE_SOURCE = "MATLAB_SIM"

& npm $viteArgs

Write-Color "Presiona Ctrl+C para detener..." $Gray