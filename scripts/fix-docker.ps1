# Script PowerShell para Diagnosticar e Corrigir Problemas do Docker Desktop
# Execute como Administrador se necessario

Write-Host "=== Diagnostico e Correcao do Docker Desktop ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se Docker Desktop esta rodando
Write-Host "[1/8] Verificando Docker Desktop..." -ForegroundColor Yellow
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "OK Docker Desktop esta rodando" -ForegroundColor Green
} else {
    Write-Host "ERRO Docker Desktop NAO esta rodando" -ForegroundColor Red
    Write-Host "  Por favor, inicie o Docker Desktop manualmente" -ForegroundColor Yellow
    exit 1
}

# 2. Parar todos os containers
Write-Host "[2/8] Parando containers..." -ForegroundColor Yellow
try {
    docker-compose down 2>&1 | Out-Null
    Write-Host "OK Containers parados" -ForegroundColor Green
} catch {
    Write-Host "AVISO Nao foi possivel parar containers (pode estar tudo parado)" -ForegroundColor Yellow
}

# 3. Verificar conexao com Docker daemon
Write-Host "[3/8] Testando conexao com Docker daemon..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Docker daemon respondendo (versao: $dockerVersion)" -ForegroundColor Green
    } else {
        Write-Host "ERRO Docker daemon NAO esta respondendo" -ForegroundColor Red
        Write-Host "  Por favor, reinicie o Docker Desktop" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERRO Erro ao conectar com Docker daemon" -ForegroundColor Red
    Write-Host "  Por favor, reinicie o Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# 4. Limpar cache do Docker (com cuidado)
Write-Host "[4/8] Limpando cache do Docker..." -ForegroundColor Yellow
Write-Host "  (Isso pode levar alguns minutos)" -ForegroundColor Gray
try {
    docker system prune -f 2>&1 | Out-Null
    Write-Host "OK Cache limpo" -ForegroundColor Green
} catch {
    Write-Host "AVISO Nao foi possivel limpar cache completamente" -ForegroundColor Yellow
}

# 5. Verificar espaco em disco
Write-Host "[5/8] Verificando espaco em disco..." -ForegroundColor Yellow
$disk = Get-PSDrive C
$freeSpaceGB = [math]::Round($disk.Free / 1GB, 2)
if ($freeSpaceGB -lt 10) {
    Write-Host "AVISO Pouco espaco em disco: $freeSpaceGB GB livres" -ForegroundColor Yellow
    Write-Host "  Recomendado: pelo menos 10GB livres" -ForegroundColor Yellow
} else {
    Write-Host "OK Espaco suficiente: $freeSpaceGB GB livres" -ForegroundColor Green
}

# 6. Verificar recursos do Docker Desktop
Write-Host "[6/8] Verificando recursos do Docker Desktop..." -ForegroundColor Yellow
Write-Host "  Por favor, verifique manualmente:" -ForegroundColor Gray
Write-Host "  - Docker Desktop -> Settings -> Resources" -ForegroundColor Gray
Write-Host "  - Memory: minimo 4GB (recomendado 8GB)" -ForegroundColor Gray
Write-Host "  - CPUs: minimo 2 cores" -ForegroundColor Gray

# 7. Rebuild do servico problematico
Write-Host "[7/8] Rebuild do servico policy-impact..." -ForegroundColor Yellow
Write-Host "  (Isso pode levar alguns minutos)" -ForegroundColor Gray
try {
    docker-compose build --no-cache policy-impact 2>&1 | Tee-Object -Variable buildOutput
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Build do policy-impact concluido com sucesso" -ForegroundColor Green
    } else {
        Write-Host "ERRO Build falhou. Verifique os logs acima." -ForegroundColor Red
        Write-Host "  Tentando solucao alternativa..." -ForegroundColor Yellow
        
        # Solucao alternativa: build direto
        Write-Host "  Tentando build direto do Dockerfile..." -ForegroundColor Yellow
        Set-Location services/policy-impact
        docker build -t atlas-policy-impact:latest . 2>&1 | Tee-Object -Variable directBuild
        Set-Location ../..
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Build direto funcionou!" -ForegroundColor Green
        } else {
            Write-Host "ERRO Build direto tambem falhou" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "ERRO Erro durante o build" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 8. Resumo final
Write-Host ""
Write-Host "[8/8] Resumo:" -ForegroundColor Cyan
Write-Host "  Se o build funcionou, voce pode continuar com:" -ForegroundColor Gray
Write-Host "    docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "  Se ainda houver problemas:" -ForegroundColor Gray
Write-Host "    1. Reinicie o Docker Desktop completamente" -ForegroundColor White
Write-Host "    2. Verifique RESOLVER_DOCKER.md para mais solucoes" -ForegroundColor White
Write-Host "    3. Considere reinstalar o Docker Desktop" -ForegroundColor White
Write-Host ""
