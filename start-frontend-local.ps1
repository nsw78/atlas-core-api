# Script para iniciar o frontend localmente (sem Docker)
# Mais rapido para desenvolvimento

Write-Host "==================================" -ForegroundColor Cyan
Write-Host " ATLAS Frontend - Inicio Rapido" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js esta instalado
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  OK Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERRO Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "  Instale Node.js 18+ de: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navegar para o diretorio do frontend
Write-Host "[2/5] Navegando para diretorio do frontend..." -ForegroundColor Yellow
Set-Location -Path "services\frontend"

# Verificar se npm esta disponivel
Write-Host "[3/5] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  OK npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERRO npm nao encontrado!" -ForegroundColor Red
    exit 1
}

# Instalar dependencias se node_modules nao existir
if (-Not (Test-Path "node_modules")) {
    Write-Host "[4/5] Instalando dependencias (primeira vez pode demorar 2-3 minutos)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO ao instalar dependencias!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK Dependencias instaladas!" -ForegroundColor Green
} else {
    Write-Host "[4/5] Dependencias ja instaladas" -ForegroundColor Green
}

# Criar .env.local se nao existir
if (-Not (Test-Path ".env.local")) {
    Write-Host "[5/5] Criando arquivo .env.local..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
"@ | Out-File -Encoding UTF8 .env.local
    Write-Host "  OK Arquivo .env.local criado!" -ForegroundColor Green
} else {
    Write-Host "[5/5] Arquivo .env.local ja existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend estara disponivel em:" -ForegroundColor Green
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar o servidor de desenvolvimento
npm run dev
