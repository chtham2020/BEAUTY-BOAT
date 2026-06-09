$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$StartPort = if ($env:BEAUTY_BOAT_OPEN_PORT) { [int]$env:BEAUTY_BOAT_OPEN_PORT } else { 3030 }
$EndPort = $StartPort + 80
$NextDir = Join-Path $ProjectRoot ".next"

if (Test-Path -LiteralPath $NextDir) {
  $ResolvedNextDir = (Resolve-Path -LiteralPath $NextDir).Path
  if ($ResolvedNextDir -like "$ProjectRoot*") {
    Remove-Item -LiteralPath $ResolvedNextDir -Recurse -Force
  }
}

function Test-PortFree {
  param([int]$Port)
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Wait-ForReady {
  param([int]$Port)
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Beauty Boat server did not become ready on port $Port"
}

$Port = $null
for ($candidate = $StartPort; $candidate -le $EndPort; $candidate++) {
  if (Test-PortFree -Port $candidate) {
    $Port = $candidate
    break
  }
}

if (-not $Port) {
  throw "No free port found from $StartPort to $EndPort"
}

Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "-p", "$Port") `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden

Wait-ForReady -Port $Port

$FrontendUrl = "http://127.0.0.1:$Port/"
$AdminUrl = "http://127.0.0.1:$Port/admin/login"

cmd /c start "" $FrontendUrl
cmd /c start "" $AdminUrl

Write-Output "Beauty Boat frontend opened: $FrontendUrl"
Write-Output "Beauty Boat admin login opened: $AdminUrl"
