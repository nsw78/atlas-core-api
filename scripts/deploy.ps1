#!/usr/bin/env pwsh
<#
.SYNOPSIS
ATLAS Frontend - Backend Deployment Script
.DESCRIPTION
Gerencia startup, shutdown e monitoramento dos containers Docker

.EXAMPLE
.\deploy.ps1 -Action start
.\deploy.ps1 -Action stop
.\deploy.ps1 -Action logs -Service frontend
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'clean')]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [ValidateSet('mvp', 'full')]
    [string]$Environment = 'mvp',

    [Parameter(Mandatory = $false)]
    [string]$Service,

    [switch]$Follow
)

$ProjectRoot = Get-Location
$ComposeFile = "docker-compose.$($Environment).yml"

function Write-Header {
    param([string]$Message)
    $line = "=" * 60
    Write-Host ""
    Write-Host $line -ForegroundColor Green
    Write-Host "  $Message" -ForegroundColor Green
    Write-Host $line -ForegroundColor Green
}

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet('success', 'error', 'info', 'warning')]
        [string]$Type = 'info'
    )
    
    $color = @{
        'success' = 'Green'
        'error'   = 'Red'
        'info'    = 'Cyan'
        'warning' = 'Yellow'
    }[$Type]
    
    $symbol = @{
        'success' = '+'
        'error'   = 'X'
        'info'    = 'I'
        'warning' = '!'
    }[$Type]
    
    Write-Host "[$symbol] $Message" -ForegroundColor $color
}

function Start-Services {
    Write-Header "Iniciando ATLAS ($Environment)"
    
    # Verificar arquivo compose
    if (-not (Test-Path $ComposeFile)) {
        Write-Status "Arquivo nao encontrado: $ComposeFile" error
        exit 1
    }
    
    # Criar .env se não existir
    if (-not (Test-Path .env)) {
        Write-Status "Criando arquivo .env..." warning
        @"
POSTGRES_PASSWORD=atlas_dev
NEO4J_PASSWORD=neo4j_dev
JWT_SECRET=dev-secret-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:8080
GRAFANA_PASSWORD=admin
"@ | Out-File -Encoding UTF8 .env
        Write-Status ".env criado com valores padrao" success
    }
    
    # Pull images
    Write-Status "Baixando imagens..." info
    docker compose -f $ComposeFile pull
    
    # Build
    Write-Status "Buildando services..." info
    docker compose -f $ComposeFile build --parallel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Erro ao fazer build" error
        exit 1
    }
    
    # Start
    Write-Status "Iniciando containers..." info
    docker compose -f $ComposeFile up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Erro ao iniciar containers" error
        exit 1
    }
    
    Write-Status "Containers iniciados!" success
    
    # Aguardar warmup
    Write-Status "Aguardando servicos ficarem prontos..." info
    Start-Sleep -Seconds 15
    
    # Mostrar status
    Show-Status
    
    # Exibir URLs
    Write-Header "Servicos Disponiveis"
    Write-Host "Frontend:       http://localhost:3000" -ForegroundColor Cyan
    Write-Host "API Gateway:    http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Prometheus:     http://localhost:9090" -ForegroundColor Cyan
    Write-Host "Grafana:        http://localhost:3001 (admin/admin)" -ForegroundColor Cyan
    Write-Host "PostgreSQL:     localhost:5432 (atlas/atlas_dev)" -ForegroundColor Cyan
    Write-Host "Redis:          localhost:6379" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Header "Parando ATLAS"
    
    Write-Status "Parando containers..." info
    docker compose -f $ComposeFile stop
    
    Write-Status "Containers parados" success
}

function Restart-Services {
    Write-Header "Reiniciando ATLAS"
    
    Stop-Services
    Start-Sleep -Seconds 3
    Start-Services
}

function Show-Logs {
    Write-Header "Logs - ATLAS"
    
    if ($Service) {
        Write-Status "Logs de $Service (Ctrl+C para parar)..." info
        docker compose -f $ComposeFile logs $(if ($Follow) { "-f" } else {}) $Service
    }
    else {
        Write-Status "Logs de todos os servicos (Ctrl+C para parar)..." info
        docker compose -f $ComposeFile logs $(if ($Follow) { "-f" })
    }
}

function Show-Status {
    Write-Header "Status dos Containers"
    
    $ps = docker compose -f $ComposeFile ps --format json | ConvertFrom-Json
    
    if ($ps.Count -eq 0) {
        Write-Status "Nenhum container em execucao" warning
        return
    }
    
    foreach ($container in $ps) {
        if ($container.State -eq "running") {
            Write-Host "[+] $($container.Service.PadRight(28)) RUNNING ($($container.Status))" -ForegroundColor Green
        }
        elseif ($container.State -eq "exited") {
            Write-Host "[X] $($container.Service.PadRight(28)) EXITED  ($($container.Status))" -ForegroundColor Red
        }
        else {
            Write-Host "[?] $($container.Service.PadRight(28)) $($container.State.ToUpper()) ($($container.Status))" -ForegroundColor Yellow
        }
    }
}

function Clean-All {
    Write-Header "Limpando ATLAS"
    
    $response = Read-Host "Deseja remover containers E volumes? (s/n)"
    if ($response -ne "s") {
        Write-Status "Operacao cancelada" warning
        return
    }
    
    Write-Status "Removendo containers..." info
    docker compose -f $ComposeFile down -v
    
    Write-Status "Limpeza concluida" success
}

# Executar acao
switch ($Action) {
    'start' { 
        Start-Services 
    }
    'stop' { 
        Stop-Services 
    }
    'restart' { 
        Restart-Services 
    }
    'logs' { 
        Show-Logs 
    }
    'status' { 
        Show-Status 
    }
    'clean' { 
        Clean-All 
    }
    default { 
        Write-Status "Acao desconhecida: $Action" error 
    }
}

Write-Host ""
