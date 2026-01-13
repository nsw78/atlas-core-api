# 🐳 Guia Completo - Rodar ATLAS no Docker Desktop (Windows)

## 📋 Pré-requisitos

1. **Docker Desktop** instalado e rodando no Windows
   - Download: https://www.docker.com/products/docker-desktop/
   - Certifique-se de que está rodando (ícone na bandeja do sistema)

2. **Git** (opcional, se ainda não tiver o código)
   - Download: https://git-scm.com/download/win

---

## 🚀 Passo a Passo Completo

### 1️⃣ Preparar o Ambiente

```powershell
# Abra PowerShell ou CMD no diretório do projeto
cd C:\Users\t.nwa_tfsports\Documents\Projetos_IA\atlas-core-api

# Verifique se o Docker está rodando
docker --version
docker-compose --version
```

### 2️⃣ Construir e Subir Todos os Serviços

```powershell
# Construir todas as imagens e subir os containers
docker-compose up --build -d
```

**O que isso faz:**
- Constrói as imagens Docker de todos os serviços (Go, Python, Node.js)
- Sobe todos os containers em background (`-d`)
- Cria a rede Docker `atlas-network`
- Configura volumes para persistência de dados

**Tempo estimado:** 5-10 minutos na primeira vez (download de imagens base)

### 3️⃣ Verificar se Tudo Está Rodando

```powershell
# Ver status de todos os containers
docker-compose ps

# Ou ver todos os containers
docker ps
```

Você deve ver algo como:
```
CONTAINER ID   IMAGE                    STATUS
abc123         atlas-frontend           Up 2 minutes
def456         atlas-api-gateway        Up 2 minutes
ghi789         atlas-iam               Up 2 minutes
...
```

### 4️⃣ Ver os Logs (Opcional)

```powershell
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f frontend
docker-compose logs -f api-gateway
```

### 5️⃣ Acessar o Frontend 🎉

Abra seu navegador e acesse:

```
http://localhost:3000
```

Você verá o dashboard do ATLAS!

---

## 🌐 URLs dos Serviços

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:3000 | Dashboard principal |
| **API Gateway** | http://localhost:8080 | API principal |
| **IAM Service** | http://localhost:8081 | Autenticação |
| **Risk Assessment** | http://localhost:8082 | Avaliação de riscos |
| **News Aggregator** | http://localhost:8083 | Agregador de notícias |
| **Grafana** | http://localhost:3001 | Monitoramento (admin/admin) |
| **Prometheus** | http://localhost:9090 | Métricas |

---

## 🧪 Testar a API

### Testar Health Check

```powershell
# No PowerShell
Invoke-WebRequest -Uri http://localhost:8080/health

# Ou no navegador
http://localhost:8080/health
```

### Testar Risk Assessment (via Frontend)

1. Acesse http://localhost:3000
2. Na seção "Risk Assessment", digite um entity ID (ex: `country-BRA`)
3. Clique em "Assess Risk"
4. Veja o resultado!

---

## 🔧 Comandos Úteis

### Parar Todos os Serviços

```powershell
docker-compose down
```

### Parar e Remover Volumes (Limpar Dados)

```powershell
docker-compose down -v
```

### Reconstruir um Serviço Específico

```powershell
# Reconstruir apenas o frontend
docker-compose build frontend
docker-compose up -d frontend

# Reconstruir apenas o API Gateway
docker-compose build api-gateway
docker-compose up -d api-gateway
```

### Ver Logs em Tempo Real

```powershell
# Todos os serviços
docker-compose logs -f

# Apenas frontend
docker-compose logs -f frontend

# Últimas 100 linhas
docker-compose logs --tail=100 frontend
```

### Entrar no Container (Debug)

```powershell
# Entrar no container do frontend
docker exec -it atlas-frontend sh

# Entrar no container do API Gateway
docker exec -it atlas-api-gateway sh
```

### Limpar Tudo e Começar do Zero

```powershell
# Parar e remover tudo
docker-compose down -v

# Remover imagens não utilizadas
docker system prune -a

# Reconstruir tudo
docker-compose up --build -d
```

---

## 🐛 Troubleshooting

### Problema: Porta já está em uso

```powershell
# Ver o que está usando a porta
netstat -ano | findstr :3000

# Parar o processo (substitua PID pelo número)
taskkill /PID <PID> /F
```

### Problema: Container não sobe

```powershell
# Ver logs do container
docker-compose logs <nome-do-servico>

# Verificar se há erros de build
docker-compose build <nome-do-servico>
```

### Problema: Frontend não carrega

1. Verifique se o API Gateway está rodando:
   ```powershell
   docker-compose ps api-gateway
   ```

2. Verifique os logs:
   ```powershell
   docker-compose logs frontend
   docker-compose logs api-gateway
   ```

3. Acesse diretamente o API Gateway:
   ```
   http://localhost:8080/health
   ```

### Problema: Erro de permissão no Windows

Se tiver problemas com permissões, execute o PowerShell como Administrador.

### Problema: Docker Desktop não está rodando

Certifique-se de que o Docker Desktop está iniciado:
- Procure pelo ícone na bandeja do sistema
- Abra o Docker Desktop
- Aguarde até aparecer "Docker Desktop is running"

---

## 📊 Monitoramento

### Grafana Dashboard

1. Acesse http://localhost:3001
2. Login: `admin` / Senha: `admin`
3. Configure a fonte de dados Prometheus:
   - URL: `http://prometheus:9090`
4. Importe dashboards ou crie os seus

### Prometheus

Acesse http://localhost:9090 para ver métricas brutas.

---

## 🔄 Atualizar Código

Se você fizer alterações no código:

```powershell
# Reconstruir e reiniciar apenas o serviço alterado
docker-compose build frontend
docker-compose up -d frontend

# Ou reconstruir tudo
docker-compose up --build -d
```

---

## 📝 Estrutura dos Containers

```
atlas-network (Docker Network)
├── frontend (Next.js)          :3000
├── api-gateway (Go)            :8080
├── iam-service (Go)             :8081
├── risk-assessment (Go)        :8082
├── news-aggregator (Python)     :8083
├── postgres                     :5432
├── redis                        :6379
├── kafka                        :9092
├── prometheus                   :9090
└── grafana                      :3001
```

---

## ✅ Checklist de Verificação

- [ ] Docker Desktop está rodando
- [ ] Todos os containers estão up (`docker-compose ps`)
- [ ] Frontend acessível em http://localhost:3000
- [ ] API Gateway responde em http://localhost:8080/health
- [ ] Logs não mostram erros críticos

---

## 🎯 Próximos Passos

1. **Desenvolver**: Faça alterações no código e reconstrua os containers
2. **Testar**: Use o frontend para testar as funcionalidades
3. **Monitorar**: Acompanhe métricas no Grafana
4. **Expandir**: Adicione novos serviços seguindo o mesmo padrão

---

## 💡 Dicas

- Use `docker-compose logs -f` para acompanhar o que está acontecendo
- Mantenha o Docker Desktop com recursos suficientes (4GB+ RAM recomendado)
- Se algo não funcionar, sempre verifique os logs primeiro
- Use `docker-compose down` antes de desligar o computador para limpar recursos

---

**Pronto! Agora você tem o ATLAS rodando localmente no Docker Desktop! 🚀**
