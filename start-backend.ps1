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

cd Siel_Spring

if ($Build) {
    Write-Host "Building Siel Metadata Kernel..." -ForegroundColor Cyan
    .\mvnw clean package -DskipTests
} else {
    Write-Host "Starting Siel Metadata Kernel..." -ForegroundColor Cyan
    .\mvnw spring-boot:run
}
