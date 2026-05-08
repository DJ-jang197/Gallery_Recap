$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$pgData = Join-Path $repoRoot "Auth\.pgdata"
$pgLog = Join-Path $repoRoot "Auth\pg.log"
$pgPort = 5433

function Test-PortOpen {
    param([int]$Port)
    # Faster localhost TCP probe using a raw socket.
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $asyncResult = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(500, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($asyncResult)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $tcp.Close()
    }
}

if (-not (Test-Path $pgCtl)) {
    throw "pg_ctl not found at '$pgCtl'. Install PostgreSQL 18 or update start-auth.ps1."
}

if (-not (Test-Path $pgData)) {
    throw "Auth local DB data directory not found at '$pgData'."
}

if (-not (Test-PortOpen -Port $pgPort)) {
    # Start project-local Postgres data directory used by Auth.
    Write-Host "Starting local Auth Postgres on port $pgPort..."
    & $pgCtl start -D $pgData -o "-p $pgPort" -l $pgLog | Out-Host
} else {
    Write-Host "Local Auth Postgres already running on port $pgPort."
}

# SELF-HEALING: Automatically clear port 3000 before starting.
Write-Host "Ensuring port 3000 is clear..." -ForegroundColor Gray
$portProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "Found existing process on 3000. Stopping it..." -ForegroundColor Yellow
    $portProcess | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# Hand off to the Auth dev server once dependencies are healthy.
npm run dev --prefix Auth
