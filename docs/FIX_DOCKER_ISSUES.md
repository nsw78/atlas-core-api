# 🔧 Solução Definitiva para Problemas de Docker

## Problema Identificado

Erro: `Unavailable: error reading from server: EOF` e `500 Internal Server Error` no Docker Desktop.

## Solução Passo a Passo

### 1. Reiniciar Docker Desktop

```powershell
# Parar Docker Desktop completamente
# 1. Clique com botão direito no ícone do Docker na bandeja do sistema
# 2. Selecione "Quit Docker Desktop"
# 3. Aguarde 10 segundos
# 4. Inicie Docker Desktop novamente
# 5. Aguarde até aparecer "Docker Desktop is running"
```

### 2. Verificar Status do Docker

```powershell
# Verificar se Docker está funcionando
docker ps

# Se der erro, tente:
docker version
```

### 3. Limpar Cache e Builds Corrompidos

```powershell
# Parar todos os containers
docker-compose down

# Limpar cache do Docker (após reiniciar Docker Desktop)
docker system prune -a --volumes -f

# Limpar apenas builds
docker builder prune -a -f
```

### 4. Rebuild do Serviço Problemático

```powershell
# Rebuild apenas o serviço policy-impact
docker-compose build --no-cache policy-impact

# Se ainda der erro, tente rebuild de todos os serviços Python
docker-compose build --no-cache policy-impact scenario-simulation war-gaming digital-twins
```

### 5. Verificar Recursos do Docker Desktop

1. Abra Docker Desktop
2. Vá em Settings → Resources
3. Verifique:
   - **Memory**: Mínimo 4GB (recomendado 8GB)
   - **CPUs**: Mínimo 2 cores
   - **Disk**: Espaço suficiente disponível

### 6. Solução Alternativa: Build Individual

Se o problema persistir, construa os serviços um por um:

```powershell
# Build individual
cd services/policy-impact
docker build -t atlas-policy-impact .
cd ../..

# Depois volte ao docker-compose
docker-compose up -d policy-impact
```

### 7. Verificar Logs do Docker Desktop

Se o problema persistir:
1. Abra Docker Desktop
2. Vá em Troubleshoot → Clean / Purge data
3. Selecione "Clean all data"
4. Reinicie Docker Desktop

### 8. Verificar WSL2 (se aplicável)

Se estiver usando WSL2:

```powershell
# Verificar versão do WSL
wsl --version

# Atualizar WSL
wsl --update

# Reiniciar WSL
wsl --shutdown
```

## Comandos de Diagnóstico

```powershell
# Verificar status do Docker
docker info

# Verificar containers rodando
docker ps -a

# Verificar imagens
docker images

# Verificar volumes
docker volume ls

# Verificar networks
docker network ls
```

## Se Nada Funcionar

1. **Reinstalar Docker Desktop**:
   - Desinstale Docker Desktop completamente
   - Baixe a versão mais recente
   - Reinstale e reinicie o computador

2. **Verificar Antivírus/Firewall**:
   - Adicione Docker Desktop às exceções
   - Desative temporariamente para testar

3. **Verificar Espaço em Disco**:
   - Certifique-se de ter pelo menos 20GB livres
   - Limpe espaço se necessário

## Prevenção

Para evitar problemas futuros:

```powershell
# Limpar regularmente
docker system prune -f

# Limpar builds antigos
docker builder prune -f

# Monitorar uso de recursos
docker stats
```
