[CmdletBinding()]
param(
  [string[]]$Path
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

$TextExtensions = @(
  ".c", ".cc", ".cpp", ".csv", ".gd", ".gitignore", ".h", ".hpp",
  ".ini", ".json", ".jsonl", ".md", ".ps1", ".py", ".toml", ".txt",
  ".yaml", ".yml"
)
$TextFileNames = @(".gitattributes", ".gitignore", "AGENTS.md", "LICENSE", "README.md")
$MaxTextFileBytes = 2MB
$Patterns = [ordered]@{
  "Wokwi token" = [regex]::new('wok_[A-Za-z0-9]{20,}', 'CultureInvariant')
  "GitHub token" = [regex]::new('gh[pousr]_[A-Za-z0-9]{20,}', 'CultureInvariant')
  "AWS access key" = [regex]::new('AKIA[0-9A-Z]{16}', 'CultureInvariant')
  "Private key" = [regex]::new('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'CultureInvariant')
  "Credential assignment" = [regex]::new(
    '(?im)\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b\s*[:=]\s*["'']?[A-Za-z0-9_+/.-]{20,}={0,2}',
    'CultureInvariant'
  )
}

function Get-ScanFiles {
  if ($Path.Count -gt 0) {
    return @($Path)
  }

  $trackedAndRelevant = @(git ls-files --cached --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo obtener la lista de archivos Git."
  }
  return $trackedAndRelevant
}

function Test-IsTextCandidate([System.IO.FileInfo]$File) {
  if ($File.Length -gt $MaxTextFileBytes) {
    return $false
  }
  return $File.Extension.ToLowerInvariant() -in $TextExtensions -or $File.Name -in $TextFileNames
}

function Get-ReportPath([string]$FilePath) {
  $absolute = [System.IO.Path]::GetFullPath($FilePath)
  if ($absolute.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $absolute.Substring($RepoRoot.Length).TrimStart(
      [System.IO.Path]::DirectorySeparatorChar,
      [System.IO.Path]::AltDirectorySeparatorChar
    )
  }
  return [System.IO.Path]::GetFileName($absolute)
}

$filesScanned = 0
$findings = 0
foreach ($candidate in Get-ScanFiles) {
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    continue
  }
  $file = Get-Item -LiteralPath $candidate
  if (-not (Test-IsTextCandidate $file)) {
    continue
  }

  $content = [System.IO.File]::ReadAllText($file.FullName)
  $filesScanned++
  foreach ($entry in $Patterns.GetEnumerator()) {
    foreach ($match in $entry.Value.Matches($content)) {
      $line = 1 + ([regex]::Matches($content.Substring(0, $match.Index), "`n")).Count
      $reportPath = Get-ReportPath $file.FullName
      Write-Host "SECRET_SCAN: FAIL file=$reportPath pattern=$($entry.Key) location=line $line"
      $findings++
    }
  }
}

if ($findings -gt 0) {
  Write-Host "SECRET_SCAN: FAIL findings=$findings (content redacted)"
  exit 1
}

Write-Host "SECRET_SCAN: PASS files=$filesScanned"
exit 0
