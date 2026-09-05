param(
  [int]$Runs = 20,
  [int]$LoadRuns = 5,
  [int]$TimeoutMs = 30000
)

$ErrorActionPreference = "Stop"
[System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::InvariantCulture
[System.Threading.Thread]::CurrentThread.CurrentUICulture = [System.Globalization.CultureInfo]::InvariantCulture

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ResultsDir = Join-Path $ScriptDir "results"
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

$Pio = Join-Path $RootDir ".venv\Scripts\platformio.exe"
if (-not (Test-Path $Pio)) {
  $Pio = Join-Path $RootDir ".venv\Scripts\platformio"
}

$Wokwi = Join-Path $RootDir "tools\wokwi-cli.exe"
if (-not (Test-Path $Wokwi)) {
  throw "No se encontro Wokwi CLI en tools\wokwi-cli.exe"
}

$Token = [Environment]::GetEnvironmentVariable("WOKWI_CLI_TOKEN", "User")
if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "WOKWI_CLI_TOKEN no esta configurado en variables de usuario."
}
[Environment]::SetEnvironmentVariable("WOKWI_CLI_TOKEN", $Token, "Process")

function Invoke-Build {
  param([string]$EnvironmentName)

  Push-Location $RootDir
  try {
    & $Pio run -e $EnvironmentName | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "PlatformIO fallo para $EnvironmentName"
    }
  } finally {
    Pop-Location
  }
}

function Invoke-Clean {
  param([string]$EnvironmentName)

  Push-Location $RootDir
  try {
    & $Pio run -e $EnvironmentName -t clean | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "PlatformIO clean fallo para $EnvironmentName"
    }
  } finally {
    Pop-Location
  }
}

function Convert-TimingLine {
  param(
    [string]$Line,
    [int]$RunId,
    [string]$RunKind,
    [string]$Scenario
  )

  $fields = [ordered]@{
    run_id = $RunId
    run_kind = $RunKind
    scenario = $Scenario
  }

  foreach ($match in [regex]::Matches($Line, "([A-Z_]+)=([A-Za-z0-9_]+)")) {
    $fields[$match.Groups[1].Value.ToLowerInvariant()] = $match.Groups[2].Value
  }

  [pscustomobject]$fields
}

function Convert-WcetLines {
  param(
    [string[]]$Lines,
    [int]$RunId,
    [string]$RunKind,
    [string]$Scenario
  )

  foreach ($line in $Lines) {
    if ($line -match "\[WCET_OBSERVED\] TASK=([A-Za-z0-9_]+) DURATION_US=([0-9]+) SEQ=([0-9]+)") {
      [pscustomobject]@{
        run_id = $RunId
        run_kind = $RunKind
        scenario = $Scenario
        task = $Matches[1]
        duration_us = [int64]$Matches[2]
        sequence = [int64]$Matches[3]
      }
    }
  }
}

function Invoke-WokwiScenario {
  param(
    [int]$RunId,
    [string]$RunKind,
    [string]$Scenario
  )

  $logPath = Join-Path $ResultsDir ("run-{0:D3}-{1}-{2}.log" -f $RunId, $RunKind, [IO.Path]::GetFileNameWithoutExtension($Scenario))

  Push-Location $ScriptDir
  try {
    & $Wokwi --timeout $TimeoutMs --scenario $Scenario --serial-log-file $logPath .
    if ($LASTEXITCODE -ne 0) {
      throw "Wokwi fallo en run $RunId ($RunKind/$Scenario)"
    }
  } finally {
    Pop-Location
  }

  $lines = Get-Content $logPath
  $timingLine = $lines | Where-Object { $_ -match "^\[TIMING\]" } | Select-Object -First 1
  if (-not $timingLine) {
    throw "No se encontro linea [TIMING] en $logPath"
  }

  $timing = Convert-TimingLine -Line $timingLine -RunId $RunId -RunKind $RunKind -Scenario $Scenario
  $wcet = @(Convert-WcetLines -Lines $lines -RunId $RunId -RunKind $RunKind -Scenario $Scenario)
  Remove-Item -LiteralPath $logPath -Force

  [pscustomobject]@{
    Timing = $timing
    Wcet = $wcet
  }
}

function Get-Percentile {
  param(
    [double[]]$Values,
    [double]$Percentile
  )

  if ($Values.Count -eq 0) {
    return $null
  }

  $sorted = $Values | Sort-Object
  $rank = [Math]::Ceiling(($Percentile / 100.0) * $sorted.Count)
  $index = [Math]::Max(0, [Math]::Min($sorted.Count - 1, $rank - 1))
  return [double]$sorted[$index]
}

function Get-Stats {
  param(
    [object[]]$Rows,
    [string]$RunKind,
    [string]$Metric
  )

  $values = @($Rows | Where-Object { $_.run_kind -eq $RunKind } | ForEach-Object { [double]$_.$Metric })
  if ($values.Count -eq 0) {
    return $null
  }

  $avg = ($values | Measure-Object -Average).Average
  $min = ($values | Measure-Object -Minimum).Minimum
  $max = ($values | Measure-Object -Maximum).Maximum
  $sorted = $values | Sort-Object
  $mid = [int]($sorted.Count / 2)
  if (($sorted.Count % 2) -eq 0) {
    $median = ([double]$sorted[$mid - 1] + [double]$sorted[$mid]) / 2.0
  } else {
    $median = [double]$sorted[$mid]
  }
  $variance = 0.0
  foreach ($value in $values) {
    $variance += [Math]::Pow($value - $avg, 2)
  }
  $stddev = [Math]::Sqrt($variance / $values.Count)

  [pscustomobject]@{
    run_kind = $RunKind
    metric = $Metric
    count = $values.Count
    min_us = [Math]::Round($min, 2)
    max_us = [Math]::Round($max, 2)
    average_us = [Math]::Round($avg, 2)
    median_us = [Math]::Round($median, 2)
    stddev_us = [Math]::Round($stddev, 2)
    p95_us = [Math]::Round((Get-Percentile -Values $values -Percentile 95), 2)
    p99_us = [Math]::Round((Get-Percentile -Values $values -Percentile 99), 2)
  }
}

$normalScenarios = @(
  "timing_test.yaml",
  "timing_zone2_test.yaml",
  "timing_both_test.yaml",
  "timing_phase_test.yaml"
)

$timingRows = New-Object System.Collections.Generic.List[object]
$wcetRows = New-Object System.Collections.Generic.List[object]
$runId = 1

Invoke-Clean -EnvironmentName "esp32doit-devkit-v1"
Invoke-Build -EnvironmentName "esp32doit-devkit-v1"
for ($i = 0; $i -lt $Runs; ++$i) {
  $scenario = $normalScenarios[$i % $normalScenarios.Count]
  $result = Invoke-WokwiScenario -RunId $runId -RunKind "normal" -Scenario $scenario
  $timingRows.Add($result.Timing)
  foreach ($row in $result.Wcet) {
    $wcetRows.Add($row)
  }
  ++$runId
}

Invoke-Build -EnvironmentName "esp32doit-devkit-v1-diagnostic-load"
for ($i = 0; $i -lt $LoadRuns; ++$i) {
  $result = Invoke-WokwiScenario -RunId $runId -RunKind "diagnostic_load" -Scenario "timing_load_test.yaml"
  $timingRows.Add($result.Timing)
  foreach ($row in $result.Wcet) {
    $wcetRows.Add($row)
  }
  ++$runId
}

$timingCsv = Join-Path $ResultsDir "timing_runs.csv"
$summaryCsv = Join-Path $ResultsDir "timing_summary.csv"
$wcetCsv = Join-Path $ResultsDir "wcet_observed.csv"

$timingRows | Export-Csv -NoTypeInformation -Path $timingCsv
$wcetRows | Export-Csv -NoTypeInformation -Path $wcetCsv

$summaryRows = New-Object System.Collections.Generic.List[object]
foreach ($kind in @("normal", "diagnostic_load")) {
  foreach ($metric in @("confirmation_us", "post_confirmation_us", "end_to_end_us")) {
    $stats = Get-Stats -Rows $timingRows -RunKind $kind -Metric $metric
    if ($stats) {
      $summaryRows.Add($stats)
    }
  }
}
$summaryRows | Export-Csv -NoTypeInformation -Path $summaryCsv

Invoke-Build -EnvironmentName "esp32doit-devkit-v1"

Write-Output "timing_runs_csv=$timingCsv"
Write-Output "timing_summary_csv=$summaryCsv"
Write-Output "wcet_observed_csv=$wcetCsv"
