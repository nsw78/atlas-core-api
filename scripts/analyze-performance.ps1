#!/usr/bin/env pwsh
<#
.SYNOPSIS
Docker Startup Performance Analyzer for ATLAS
.DESCRIPTION
Monitora o tempo de startup dos containers e identifica gargalos
#>

function Measure-ContainerStartup {
    param(
        [string]$ServiceName,
        [int]$TimeoutSeconds = 120
    )
    
    $start = Get-Date
    $container = "$ServiceName"
    
    Write-Host "⏱️  Medindo startup de: $container" -ForegroundColor Cyan
    
    $elapsed = (Get-Date) - $start
    Write-Host "✓ $container iniciado em $($elapsed.TotalSeconds)s" -ForegroundColor Green
    
    return $elapsed.TotalSeconds
}

function Analyze-Endpoints {
    param(
        [string[]]$Endpoints,
        [int]$Timeout = 5000
    )
    
    Write-Host "`n📊 Analisando Performance de Endpoints..." -ForegroundColor Yellow
    
    $results = @()
    
    foreach ($endpoint in $Endpoints) {
        try {
            $start = Get-Date
            $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec ($Timeout / 1000) -ErrorAction Stop
            $elapsed = (Get-Date) - $start
            
            $results += @{
                Endpoint = $endpoint
                StatusCode = $response.StatusCode
                Time_ms = $elapsed.TotalMilliseconds
                Status = "✓"
            }
            
            Write-Host "✓ $endpoint - ${$($elapsed.TotalMilliseconds)ms}" -ForegroundColor Green
        }
        catch {
            $results += @{
                Endpoint = $endpoint
                StatusCode = "ERROR"
                Time_ms = -1
                Status = "✗"
            }
            
            Write-Host "✗ $endpoint - TIMEOUT/ERROR" -ForegroundColor Red
        }
    }
    
    return $results
}

function Get-ContainerMetrics {
    Write-Host "`n📈 Coletando Métricas dos Containers..." -ForegroundColor Yellow
    
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-Object -Skip 1
    
    foreach ($line in $containers) {
        if ($line) {
            $parts = $line -split '\s+' | Where-Object { $_ }
            $name = $parts[0]
            $status = $parts[1..($parts.Length-1)] -join ' '
            
            Write-Host "$name : $status" -ForegroundColor Cyan
        }
    }
}

# Main
Write-Host "🚀 ATLAS Docker Startup Performance Analysis`n" -ForegroundColor Green

# Health check endpoints
$endpoints = @(
    "http://localhost:8080/api/health",
    "http://localhost:8081/api/health",
    "http://localhost:8082/api/health",
    "http://localhost:3000"
)

# Esperar containers ficarem online
Write-Host "⏳ Aguardando containers ficarem online..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Coletar métricas
Get-ContainerMetrics

# Analisar endpoints
$endpointResults = Analyze-Endpoints -Endpoints $endpoints

# Relatório
Write-Host "`n" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "RELATÓRIO DE PERFORMANCE" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

$endpointResults | Format-Table -AutoSize

$avgTime = ($endpointResults.Time_ms | Where-Object { $_ -gt 0 } | Measure-Object -Average).Average
Write-Host "`nTempo médio de resposta: ${avgTime}ms" -ForegroundColor Cyan

# Recomendações
Write-Host "`n💡 RECOMENDAÇÕES DE OTIMIZAÇÃO:" -ForegroundColor Yellow
Write-Host "1. Verificar Connection Pooling no PostgreSQL"
Write-Host "2. Aumentar shared_buffers conforme carga"
Write-Host "3. Implementar Redis caching para queries frequentes"
Write-Host "4. Usar índices apropriados no banco de dados"
Write-Host "5. Ativar compressão de respostas (gzip)"
Write-Host "6. Implementar request batching para operações em lote"
