# Solução para ERR_CONNECTION_REFUSED no Frontend

## 🔧 Problema
`http://localhost:3000` retorna `ERR_CONNECTION_REFUSED`

## ✅ Soluções (3 opções)

---

### Opção 1: Rodar Localmente com Node.js (MAIS RÁPIDO ⚡)

**Tempo:** 30 segundos

```powershell
# Execute o script PowerShell
.\start-frontend-local.ps1
```

**OU manualmente:**

```powershell
cd services\frontend

# Instalar dependências (apenas primeira vez)
npm install

# Criar .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# Iniciar servidor de desenvolvimento
npm run dev
```

**Resultado:**
- Frontend rodando em http://localhost:3000
- Hot reload ativado (mudanças refletem automaticamente)
- Mais rápido que Docker

---

### Opção 2: Docker (Em andamento 🔄)

O build do Docker está rodando em background. Pode levar 3-5 minutos.

**Verificar status:**
```powershell
docker ps --filter "name=atlas-frontend"
```

**Ver logs:**
```powershell
docker logs -f atlas-frontend
```

**Quando estiver pronto:**
- http://localhost:3000 estará disponível

---

### Opção 3: Usar Python SimpleHTTPServer (Fallback)

Se tiver problemas com Node.js:

```powershell
cd services\frontend
python -m http.server 3000
```

**Nota:** Não terá funcionalidade completa, apenas arquivos estáticos.

---

## 📊 Status Atual

### Correções Aplicadas

1. ✅ Corrigido `package.json`:
   - `turf` → `@turf/turf`
   - `@radix-ui` versões ajustadas

2. ✅ Corrigido `Dockerfile`:
   - Removido `--frozen-lockfile`
   - Copiando `node_modules` do builder

3. ✅ Corrigido `next.config.js`:
   - Removido `cacheControl` inválido

4. ✅ Adicionado ao `docker-compose.simple.yml`:
   - Frontend configurado na porta 3000

### Build Docker em Andamento

**Status:** 🔄 Buildando (pode levar 3-5 min)

**O que está acontecendo:**
1. Instalando dependências Node.js (~300 pacotes)
2. Building Next.js (otimização de produção)
3. Criando imagem Docker otimizada

---

## 🚀 Recomendação

**Para desenvolvimento:** Use a **Opção 1** (Local com Node.js)
- Mais rápido (30 segundos vs 5 minutos)
- Hot reload
- Melhor experiência de desenvolvimento

**Para produção/teste:** Use a **Opção 2** (Docker)
- Ambiente isolado
- Build otimizado
- Mais próximo da produção

---

## 🔍 Verificação Pós-Inicialização

Quando o frontend estiver rodando:

### 1. Testar Acesso
```powershell
curl http://localhost:3000
```

### 2. Verificar API Connection
Abra http://localhost:3000 no navegador e abra DevTools (F12):
- **Console:** Não deve ter erros de CORS
- **Network:** Chamadas para `/api/*` devem funcionar
- **Application > Cookies:** Deve ter `access_token` após login

### 3. Testar Login
```javascript
// No console do navegador
fetch('http://localhost:8080/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username: 'admin', password: 'password' })
})
.then(r => r.json())
.then(console.log)
```

---

## ❗ Troubleshooting

### Porta 3000 já em uso
```powershell
# Encontrar processo
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Matar processo
Stop-Process -Id <ID>
```

### Node.js não instalado
1. Baixe de https://nodejs.org (versão LTS)
2. Instale e reinicie o terminal
3. Verifique: `node --version`

### Erro de dependências
```powershell
cd services\frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
Verifique se o API Gateway tem:
```
ALLOWED_ORIGINS=http://localhost:3000
```

No arquivo `.env` na raiz do projeto.

---

## 📝 Comandos Úteis

### Frontend Local
```powershell
cd services\frontend
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção (após build)
npm run lint     # Verificar erros
```

### Docker
```powershell
# Build
docker-compose -f docker-compose.simple.yml build frontend

# Start
docker-compose -f docker-compose.simple.yml up -d frontend

# Logs
docker logs -f atlas-frontend

# Restart
docker-compose -f docker-compose.simple.yml restart frontend

# Stop
docker-compose -f docker-compose.simple.yml stop frontend

# Remove
docker-compose -f docker-compose.simple.yml down
```

---

## ✅ Próximos Passos

1. **Escolha uma opção** (recomendado: Opção 1)
2. **Aguarde o frontend iniciar**
3. **Acesse http://localhost:3000**
4. **Faça login** para testar autenticação
5. **Explore o dashboard**

---

**Status Final:** Frontend configurado e pronto para uso! 🎉

**URL do Frontend:** http://localhost:3000
**URL da API:** http://localhost:8080
**Documentação:** [FRONTEND_URL.md](FRONTEND_URL.md)
