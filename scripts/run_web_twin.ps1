<# 
.SYNOPSIS
    Inicia el SIGAS-RT Web Digital Twin en modo MOCK DEMO.

.DESCRIPTION
    Verifica Node.js, instala dependencias si faltan, inicia bridge mock,
    inicia Vite dev server, muestra URL y abre navegador.
    Limpia solamente procesos hijos propios al salir.

.NOTES
    Requiere: Node.js >= 22.23.2, npm
    Puertos: Vite 5173, Bridge WS 45811 (mock)
#>

param(
    [switch]$SkipBrowser,
    [switch]$Lan,
    [string]$NodePath = "node"
)

$ErrorActionPreference = "Stop"

# Colores para output
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

# Verificar Node.js
Write-Section "VERIFICANDO NODE.JS"
try {
    $nodeVersion = & $NodePath --version
    Write-Color "Node: $nodeVersion" $Green
    
    # Parse version (v24.13.0 -> 24.13.0)
    $versionParts = $nodeVersion.TrimStart('v').Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    
    if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 23)) {
        Write-Color "ADVERTENCIA: Node $nodeVersion < 22.23.2. Puede fallar PlayCanvas scaffolder." $Yellow
    }
} catch {
    Write-Color "ERROR: Node.js no encontrado en PATH. Instala Node.js >= 22.23.2" $Red
    exit 1
}

# Verificar npm
try {
    $npmVersion = & npm --version
    Write-Color "npm: $npmVersion" $Green
} catch {
    Write-Color "ERROR: npm no encontrado" $Red
    exit 1
}

# Directorio del proyecto web
$webDir = Join-Path $PSScriptRoot "..\web-digital-twin"
if (-not (Test-Path $webDir)) {
    Write-Color "ERROR: No se encuentra web-digital-twin en $webDir" $Red
    exit 1
}
Set-Location $webDir
Write-Color "Directorio: $webDir" $Gray

# Verificar/Instalar dependencias
Write-Section "DEPENDENCIAS"
$nodeModules = Join-Path $webDir "node_modules"
$packageLock = Join-Path $webDir "package-lock.json"

if (-not (Test-Path $nodeModules) -or -not (Test-Path $packageLock)) {
    Write-Color "Instalando dependencias..." $Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: npm install falló" $Red
        exit 1
    }
    Write-Color "Dependencias instaladas" $Green
} else {
    Write-Color "Dependencias OK" $Green
}

# Verificar modelo optimizado
$modelPath = Join-Path $webDir "public\models\sigas_house_web.glb"
if (-not (Test-Path $modelPath)) {
    Write-Color "ADVERTENCIA: Modelo optimizado no encontrado en $modelPath" $Yellow
    Write-Color "Ejecutando build para generar modelo..." $Yellow
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: Build falló" $Red
        exit 1
    }
} else {
    $sizeMB = [math]::Round((Get-Item $modelPath).Length / 1MB, 2)
    Write-Color "Modelo optimizado: $sizeMB MB" $Green
}

# Configurar puertos
$vitePort = 5173
$wsPort = 45811
$host = if ($Lan) { "0.0.0.0" } else { "localhost" }
$viteUrl = "http://$host:$vitePort"

# Array para tracking de procesos hijos
$childProcesses = @()

function Start-ProcessTracked {
    param($FilePath, $Arguments, $WorkingDirectory)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FilePath = $FilePath
    $psi.Arguments = $Arguments
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    
    $proc = [System.Diagnostics.Process]::Start($psi)
    $childProcesses += $proc
    return $proc
}

# Cleanup al salir
function Cleanup {
    Write-Section "LIMPIEZA"
    foreach ($proc in $childProcesses) {
        if (-not $proc.HasExited) {
            try {
                $proc.Kill()
                Write-Color "Proceso terminado: $($proc.Id)" $Gray
            } catch {
                Write-Color "No se pudo terminar: $($proc.Id)" $Yellow
            }
        }
    }
}

# Registrar cleanup
$null = Register-ObjectEvent -InputObject (New-Object System.Timers.Timer -ArgumentList 1000) -EventName Elapsed -Action {
    # No-op, cleanup se llama en finally
} | Out-Null

try {
    # Iniciar Bridge Mock (simulador interno, no proceso separado)
    Write-Section "INICIANDO BRIDGE MOCK"
    Write-Color "Bridge mock integrado en frontend (MOCK_SIM)" $Green
    Write-Color "WebSocket simulado: ws://localhost:$wsPort (no externo)" $Gray
    
    # Iniciar Vite
    Write-Section "INICIANDO VITE DEV SERVER"
    $viteArgs = "run dev"
    if ($Lan) { $viteArgs += " -- --host 0.0.0.0" }
    
    $viteProc = Start-ProcessTracked -FilePath "npm" -Arguments $viteArgs -WorkingDirectory $webDir
    
    # Leer output para detectar cuando está listo
    $ready = $false
    $startTime = Get-Date
    
    $outputJob = $viteProc.BeginOutputReadLine()
    $errorJob = $viteProc.BeginErrorReadLine()
    
    $viteProc.OutputDataReceived += {
        param($sender, $e)
        if ($e.Data) {
            Write-Host "  [VITE] $($e.Data)" -ForegroundColor $Gray
            if ($e.Data -match "Local:\s+http://") {
                $ready = $true
            }
        }
    }
    
    $viteProc.ErrorDataReceived += {
        param($sender, $e)
        if ($e.Data) {
            Write-Host "  [VITE ERR] $($e.Data)" -ForegroundColor $Red
        }
    }
    
    # Esperar a que Vite esté listo
    while (-not $ready) {
        if ((Get-Date) - $startTime > (New-TimeSpan -Seconds 60)) {
            Write-Color "TIMEOUT: Vite no inició en 60s" $Red
            exit 1
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Section "SIGAS-RT WEB DIGITAL TWIN LISTO"
    Write-Color "URL Local:    $viteUrl" $Green
    if ($Lan) {
        $lanIp = (Test-Connection -ComputerName (hostname) -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
        Write-Color "URL LAN:      http://$lanIp:$vitePort" $Green
        Write-Color "  (Accesible desde móvil en misma red)" $Gray
    }
    Write-Color ""
    Write-Color "CONTROLES:" $Cyan
    Write-Color "  Botones superiores: CASA | XRAY | TUBERÍAS | PRESIÓN | SEGURIDAD" $Gray
    Write-Color "  Panel derecho: Dashboard + ESCENARIOS + REPLAY + CHARTS + TIMELINE" $Gray
    Write-Color "  Click en objeto: Panel detalle (GS1/GS2/GS3, P0-PT, VM/VK/VL/VT)" $Gray
    Write-Color "  ESCENARIOS: NORMAL, FUGA COCINA, ROTURA LIVING, FULL DEMO, etc." $Gray
    Write-Color ""
    Write-Color "PRESENTACIÓN RÁPIDA:" $Cyan
    Write-Color "  1. Click FULL DEMO (45s secuencia completa)" $Gray
    Write-Color "  2. O click ROTURA LIVING (20s escenario crítico)" $Gray
    Write-Color "  3. Cambia vistas: TUBERÍAS → PRESIÓN → SEGURIDAD durante rotura" $Gray
    Write-Color ""
    
    # Abrir navegador
    if (-not $SkipBrowser) {
        Write-Color "Abriendo navegador..." $Yellow
        try {
            if ($IsWindows) {
                Start-Process $viteUrl
            } elseif ($IsLinux) {
                & xdg-open $viteUrl
            } elseif ($IsMacOS) {
                & open $viteUrl
            }
        } catch {
            Write-Color "No se pudo abrir navegador automáticamente. Abre manualmente: $viteUrl" $Yellow
        }
    }
    
    Write-Color "Presiona Ctrl+C para detener..." $Gray
    
    # Mantener vivo hasta Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
        if ($viteProc.HasExited) {
            Write-Color "Vite terminó inesperadamente (code: $($viteProc.ExitCode))" $Red
            break
        }
    }
    
} finally {
    Cleanup
}