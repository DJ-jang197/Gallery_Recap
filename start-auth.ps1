$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$pgData = Join-Path $repoRoot "Auth\.pgdata"
$pgLog = Join-Path $repoRoot "Auth\pg.log"
$pgPort = 5433

function Test-PortOpen {
    param([int]$Port)
    # Lightweight localhost TCP probe used before starting Postgres.
    try {
        $res = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
        return [bool]$res.TcpTestSucceeded
    } catch {
        return $false
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

# Hand off to the Auth dev server once dependencies are healthy.
npm run dev --prefix Auth
