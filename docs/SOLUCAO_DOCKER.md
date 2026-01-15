# 🔧 Solução Definitiva para Problemas de Docker

## Problema

Erro: `Unavailable: error reading from server: EOF` e `500 Internal Server Error` ao fazer build do Docker.

## ✅ Solução Rápida (Recomendada)

### Passo 1: Reiniciar Docker Desktop

1. **Feche completamente o Docker Desktop**:
   - Clique com botão direito no ícone do Docker na bandeja do sistema (canto inferior direito)
   - Selecione **"Quit Docker Desktop"**
   - Aguarde 10-15 segundos

2. **Inicie o Docker Desktop novamente**:
   - Abra o Docker Desktop
   - Aguarde até aparecer **"Docker Desktop is running"** (pode levar 1-2 minutos)

### Passo 2: Executar Script de Correção

```powershell
# Execute o script de correção
.\fix-docker.ps1
```

### Passo 3: Rebuild do Serviço

```powershell
# Rebuild apenas o serviço problemático
docker-compose build --no-cache policy-impact

# Se funcionar, inicie todos os serviços
docker-compose up -d
```

---

## 🔍 Solução Detalhada (Se a Rápida Não Funcionar)

### Opção 1: Limpar Tudo e Rebuild

```powershell
# 1. Parar tudo
docker-compose down

# 2. Limpar cache do Docker (após reiniciar Docker Desktop)
docker system prune -a --volumes -f

# 3. Rebuild específico
docker-compose build --no-cache policy-impact scenario-simulation war-gaming digital-twins

# 4. Iniciar serviços
docker-compose up -d
```

### Opção 2: Build Individual (Bypass docker-compose)

Se o docker-compose continuar falhando:

```powershell
# Build direto do Dockerfile
cd services/policy-impact
docker build -t atlas-policy-impact:latest .
cd ../..

# Depois adicione manualmente ao docker-compose ou use:
docker run -d --name atlas-policy-impact -p 8096:8096 atlas-policy-impact:latest
```

### Opção 3: Verificar e Ajustar Recursos do Docker Desktop

1. Abra **Docker Desktop**
2. Vá em **Settings** (⚙️) → **Resources**
3. Verifique e ajuste:
   - **Memory**: Mínimo **4GB** (recomendado **8GB**)
   - **CPUs**: Mínimo **2 cores**
   - **Disk image size**: Pelo menos **60GB**
4. Clique em **"Apply & Restart"**

### Opção 4: Limpar Dados do Docker Desktop

Se nada funcionar:

1. Abra **Docker Desktop**
2. Vá em **Troubleshoot** (🔧)
3. Clique em **"Clean / Purge data"**
4. Selecione **"Clean all data"**
5. Reinicie o Docker Desktop
6. Aguarde a reinicialização completa

---

## 🚨 Problemas Comuns e Soluções

### Erro: "500 Internal Server Error"

**Causa**: Docker daemon não está respondendo

**Solução**:
```powershell
# 1. Reinicie Docker Desktop completamente
# 2. Aguarde 2 minutos após iniciar
# 3. Teste: docker ps
```

### Erro: "EOF" durante build

**Causa**: Conexão perdida com Docker daemon durante build longo

**Solução**:
```powershell
# Build com timeout maior
docker-compose build --progress=plain --no-cache policy-impact

# Ou build um serviço por vez
docker-compose build --no-cache policy-impact
docker-compose build --no-cache scenario-simulation
# etc...
```

### Erro: "Out of disk space"

**Causa**: Sem espaço em disco

**Solução**:
```powershell
# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar tudo
docker system prune -a --volumes -f
```

### Erro: "Cannot connect to Docker daemon"

**Causa**: Docker Desktop não está rodando ou WSL2 com problemas

**Solução**:
```powershell
# Verificar se Docker Desktop está rodando
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

# Se não estiver, inicie manualmente

# Se estiver usando WSL2:
wsl --update
wsl --shutdown
# Depois reinicie Docker Desktop
```

---

## 📊 Verificação de Status

Execute estes comandos para diagnosticar:

```powershell
# 1. Verificar se Docker está funcionando
docker ps

# 2. Verificar versão
docker version

# 3. Verificar informações do sistema
docker info

# 4. Verificar imagens
docker images | findstr atlas

# 5. Verificar containers
docker ps -a | findstr atlas

# 6. Verificar networks
docker network ls | findstr atlas
```

---

## 🔄 Reinstalação Completa (Último Recurso)

Se NADA funcionar:

1. **Desinstalar Docker Desktop**:
   - Windows Settings → Apps → Docker Desktop → Uninstall
   - Remova também dados em: `%APPDATA%\Docker`

2. **Reinstalar**:
   - Baixe a versão mais recente de: https://www.docker.com/products/docker-desktop
   - Instale e reinicie o computador

3. **Configurar**:
   - Abra Docker Desktop
   - Configure recursos (8GB RAM, 4 CPUs)
   - Aguarde inicialização completa

4. **Rebuild**:
   ```powershell
   docker-compose build
   docker-compose up -d
   ```

---

## ✅ Checklist de Verificação

Antes de reportar problemas, verifique:

- [ ] Docker Desktop está rodando e mostra "Docker Desktop is running"
- [ ] `docker ps` funciona sem erros
- [ ] Há pelo menos 10GB de espaço livre em disco
- [ ] Docker Desktop tem pelo menos 4GB de RAM alocados
- [ ] Não há antivírus bloqueando Docker
- [ ] Firewall do Windows não está bloqueando Docker
- [ ] WSL2 está atualizado (se aplicável)

---

## 📞 Próximos Passos

Se após todas essas tentativas o problema persistir:

1. Verifique os logs do Docker Desktop:
   - Docker Desktop → Troubleshoot → View logs

2. Verifique logs do build:
   ```powershell
   docker-compose build --progress=plain policy-impact 2>&1 | Tee-Object build.log
   ```

3. Considere build em máquina diferente para isolar problema de hardware/OS

---

**Última atualização**: 2024
