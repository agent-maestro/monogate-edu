$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dashboardUrl = "http://127.0.0.1:5191/visualizer"
$stateUrl = "http://127.0.0.1:5191/state"
$serialPort = if ($env:MG_SERIAL_PORT) { $env:MG_SERIAL_PORT } else { "COM6" }
$serialBaud = if ($env:MG_SERIAL_BAUD) { $env:MG_SERIAL_BAUD } else { "115200" }

function Find-RepoRoot {
  param([string]$Start)

  $current = Resolve-Path $Start
  while ($current) {
    $candidate = Join-Path $current "dashboards\esp32-arduino\dashboard.py"
    if (Test-Path $candidate) {
      return $current
    }

    $parent = Split-Path -Parent $current
    if (-not $parent -or $parent -eq $current) {
      break
    }
    $current = $parent
  }

  throw "Could not find dashboards\esp32-arduino\dashboard.py above $Start. Run this launcher from the downloaded Monogate Electronics course bundle."
}

$repoRoot = Find-RepoRoot $scriptDir

Set-Location $repoRoot

function Test-DashboardRunning {
  try {
    Invoke-WebRequest -UseBasicParsing $stateUrl -TimeoutSec 1 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-DashboardRunning)) {
  $python = Get-Command python -ErrorAction Stop
  $args = @(
    "dashboards\esp32-arduino\dashboard.py",
    "--port", $serialPort,
    "--baud", $serialBaud
  )
  Start-Process -WindowStyle Hidden -FilePath $python.Source -ArgumentList $args -WorkingDirectory $repoRoot
  Start-Sleep -Seconds 2
}

Start-Process $dashboardUrl

Write-Host ""
Write-Host "Reflex Lab 01 dashboard opened:" -ForegroundColor Green
Write-Host "  $dashboardUrl"
Write-Host ""
Write-Host "Serial port: $serialPort @ $serialBaud"
Write-Host "If the board is offline, check the USB cable and COM port."

