# Resolvendo Erros de Montagem no Docker Desktop - Windows

## Problema
Erros ao criar containers com mensagens como:
- `mount callback failed`
- `read-only file system`
- `input/output error`

## Solução Passo a Passo

### 1. PRIMEIRA OPÇÃO: Reiniciar o Docker Desktop
```powershell
# Abra o PowerShell como Administrador
# Parar o Docker Desktop completamente
Get-Process com.docker.backend -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process dockerd -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process docker -ErrorAction SilentlyContinue | Stop-Process -Force

# Aguarde 5 segundos
Start-Sleep -Seconds 5

# Reinicie o Docker Desktop (clique no ícone do Docker ou execute)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Aguarde ~30 segundos para inicializar
Start-Sleep -Seconds 30
```

### 2. SEGUNDA OPÇÃO: Resetar Docker (se não funcionar)
```powershell
# Como Administrador
# Limpar volumes, containers e images não utilizados
docker system prune -a --volumes -f

# Resetar Docker Settings
# Settings > General > Reset Docker to factory settings
# OU via CLI:
docker system prune -a --volumes -f --force
```

### 3. TERCEIRA OPÇÃO: Verificar Espaço em Disco
```powershell
# Verificar espaço disponível
Get-Volume

# Se pouco espaço, liberar espaço no C:
# - Limpar Downloads
# - Limpar Temp: Remove-Item $env:TEMP\* -Force -Recurse
# - Limpar Docker images antigos
```

### 4. QUARTA OPÇÃO: Ajustar Configuração do Docker Desktop

Abra Docker Desktop > Settings:

**General:**
- ✓ Use WSL 2 based engine (recomendado para Windows)
- ✓ Start Docker Desktop when you log in

**Resources:**
- CPUs: 4+ (recomendado)
- Memory: 4GB+ (recomendado 6-8GB)
- Disk image size: 64GB+

**WSL Integration:**
- ✓ Integração com WSL 2 ativada

### 5. QUINTA OPÇÃO: Atualizar Docker Desktop
```powershell
# Verifique se há atualizações disponíveis
# Docker Desktop > Check for Updates
```

### 6. SEXTA OPÇÃO: Usar Configuração Simplificada
Se nenhuma das opções anteriores funcionar, use o arquivo `docker-compose.mvp.yml`:

```powershell
docker-compose -f docker-compose.mvp.yml up --build
```

## Comandos Úteis

```powershell
# Ver status do Docker
docker ps

# Limpar tudo
docker system prune -a --volumes -f

# Verificar logs de um container
docker logs container-name

# Remover todos os volumes
docker volume prune -f

# Verificar saúde do Docker
docker run hello-world
```

## Se ainda não funcionar

1. **Desinstalar e Reinstalar Docker Desktop**
   - Remove: Settings > Apps & Features > Docker Desktop
   - Download: https://www.docker.com/products/docker-desktop
   - Instale novamente

2. **Usar Docker com WSL 2**
   - Ative WSL 2: `wsl --install -d Ubuntu`
   - Configure Docker para usar WSL 2

3. **Verificar Antivírus**
   - Alguns antivírus bloqueiam Docker
   - Adicione Docker às exceções do antivírus

## Teste após correção

```powershell
cd C:\Users\t.nwa_tfsports\Documents\Projetos_IA\atlas-core-api
docker-compose up --build
```
