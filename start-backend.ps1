param (
    [switch]$Build
)

$root = Get-Location
$javaPath = Join-Path $root ".jdk\jdk-17.0.11+9"

if (-not (Test-Path $javaPath)) {
    Write-Error "Could not find JDK at $javaPath"
    exit 1
}

$env:JAVA_HOME = $javaPath
$env:Path = "$(Join-Path $javaPath "bin");$env:Path"

# Load local secrets from .env (KEY=VALUE), if present.
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim().Trim("'`"")
            if ($name) {
                Set-Item -Path "Env:$name" -Value $value
            }
        }
    }
}

if (-not $env:GEMINI_API_KEY) {
    # Startup still proceeds; synthesis simply falls back from live Gemini.
    Write-Host "WARNING: GEMINI_API_KEY is not set. Journal generation will not use live Gemini." -ForegroundColor Yellow
}

# SELF-HEALING: Automatically clear port 8080 before starting
Write-Host "Ensuring port 8080 is clear..." -ForegroundColor Gray
$portProcess = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "Found existing process on 8080. Stopping it..." -ForegroundColor Yellow
    $portProcess | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

cd Siel_Spring

if ($Build) {
    # Build-only mode compiles backend artifacts without launching server.
    Write-Host "Building Siel Metadata Kernel..." -ForegroundColor Cyan
    .\mvnw clean package -DskipTests
} else {
    # Default mode runs Spring Boot for local development.
    Write-Host "Starting Siel Metadata Kernel..." -ForegroundColor Cyan
    .\mvnw spring-boot:run
}
