# ATLAS API - Validation Script for Improvements
# This script validates all implemented improvements

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "ATLAS API - Improvements Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

function Test-Feature {
    param(
        [string]$Name,
        [scriptblock]$Test
    )

    Write-Host "Testing: $Name..." -ForegroundColor Yellow
    try {
        $result = & $Test
        if ($result) {
            Write-Host "  [OK] $Name" -ForegroundColor Green
            $script:SuccessCount++
        } else {
            Write-Host "  [FAIL] $Name" -ForegroundColor Red
            $script:ErrorCount++
        }
    } catch {
        Write-Host "  [ERROR] $Name - $($_.Exception.Message)" -ForegroundColor Red
        $script:ErrorCount++
    }
    Write-Host ""
}

# 1. Check if files exist
Test-Feature "Rate Limiting Middleware" {
    Test-Path "services\api-gateway\internal\api\middleware\ratelimit.go"
}

Test-Feature "Circuit Breaker Implementation" {
    Test-Path "services\api-gateway\internal\infrastructure\circuitbreaker\breaker.go"
}

Test-Feature "Redis Cache Module" {
    Test-Path "services\api-gateway\internal\infrastructure\cache\redis.go"
}

Test-Feature "Security Headers Middleware" {
    $content = Get-Content "services\api-gateway\internal\api\middleware\common.go" -Raw
    $content -match "SecurityHeaders" -and $content -match "X-Frame-Options"
}

Test-Feature "CORS Configuration" {
    $content = Get-Content "services\api-gateway\internal\api\middleware\common.go" -Raw
    $content -match "SecureCORS" -and $content -match "AllowOrigins"
}

Test-Feature "httpOnly Cookie Implementation" {
    $content = Get-Content "services\api-gateway\internal\api\handlers\auth.go" -Raw
    $content -match "SetCookie" -and $content -match "httpOnly"
}

Test-Feature "Frontend withCredentials" {
    $content = Get-Content "services\frontend\lib\axios.ts" -Raw
    $content -match "withCredentials: true"
}

Test-Feature "Database Migration 000001" {
    Test-Path "migrations\000001_init_schema.up.sql"
}

Test-Feature "Geospatial Migration 000002" {
    Test-Path "migrations\000002_geospatial.up.sql"
}

Test-Feature "NGINX Configuration" {
    Test-Path "nginx.conf"
}

Test-Feature "Production Docker Compose" {
    Test-Path "docker-compose.prod.yml"
}

Test-Feature "PostgreSQL Backup Service in Compose" {
    $content = Get-Content "docker-compose.prod.yml" -Raw
    $content -match "postgres-backup"
}

Test-Feature "Increased PostgreSQL Connections" {
    $content = Get-Content "docker-compose.yml" -Raw
    $content -match "max_connections=500"
}

Test-Feature "Unit Tests - Middleware" {
    Test-Path "services\api-gateway\internal\api\middleware\common_test.go"
}

Test-Feature "Unit Tests - Circuit Breaker" {
    Test-Path "services\api-gateway\internal\infrastructure\circuitbreaker\breaker_test.go"
}

Test-Feature "GZip Compression in Main" {
    $content = Get-Content "services\api-gateway\cmd\main.go" -Raw
    $content -match "gzip.Gzip"
}

Test-Feature "Makefile Migration Commands" {
    $content = Get-Content "Makefile" -Raw
    $content -match "migrate-up" -and $content -match "migrate-down"
}

# Check Go modules
Test-Feature "Go Dependencies Updated" {
    $content = Get-Content "services\api-gateway\go.mod" -Raw
    $hasRateLimiter = $content -match "ulule/limiter"
    $hasCircuitBreaker = $content -match "sony/gobreaker"
    $hasRedis = $content -match "redis/go-redis"
    $hasGzip = $content -match "gin-contrib/gzip"
    $hasCors = $content -match "gin-contrib/cors"

    $hasRateLimiter -and $hasCircuitBreaker -and $hasRedis -and $hasGzip -and $hasCors
}

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $SuccessCount" -ForegroundColor Green
Write-Host "Failed: $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "ALL IMPROVEMENTS VALIDATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: cd services/api-gateway && go mod tidy" -ForegroundColor White
    Write-Host "  2. Run: make test" -ForegroundColor White
    Write-Host "  3. Run: docker-compose up -d" -ForegroundColor White
    Write-Host "  4. Test endpoints with rate limiting" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "SOME VALIDATIONS FAILED. Please review the errors above." -ForegroundColor Red
    exit 1
}

# Optional: Test Docker services
$testDocker = Read-Host "Do you want to test if Docker services are running? (y/n)"
if ($testDocker -eq "y") {
    Write-Host ""
    Write-Host "Checking Docker services..." -ForegroundColor Yellow

    try {
        docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "atlas-"
    } catch {
        Write-Host "Docker is not running or no ATLAS services are running." -ForegroundColor Red
    }
}

# Optional: Run tests
$runTests = Read-Host "`nDo you want to run Go tests? (y/n)"
if ($runTests -eq "y") {
    Write-Host ""
    Write-Host "Running Go tests..." -ForegroundColor Yellow

    Push-Location "services\api-gateway"
    go test ./... -v
    Pop-Location
}
