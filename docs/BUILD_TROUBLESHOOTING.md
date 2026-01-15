# 🔧 Troubleshooting - Build Docker

## Problema: Import não utilizado

Se você ver erros como:
```
"go.uber.org/zap" imported and not used
```

### Solução 1: Limpar cache do Docker

```powershell
# Parar tudo
docker-compose down

# Limpar cache de build
docker builder prune -a

# Reconstruir sem cache
docker-compose build --no-cache

# Subir novamente
docker-compose up -d
```

### Solução 2: Reconstruir apenas o serviço problemático

```powershell
# Reconstruir apenas api-gateway sem cache
docker-compose build --no-cache api-gateway

# Subir novamente
docker-compose up -d api-gateway
```

### Solução 3: Verificar arquivos localmente

```powershell
# Verificar se há imports não utilizados
cd services/api-gateway
go build ./...
```

Se houver erros, corrija os imports e tente novamente.

## Problema: go.sum faltando entradas

Se você ver erros sobre `go.sum`:

```powershell
# Gerar go.sum localmente
cd services/api-gateway
go mod tidy
cd ../iam
go mod tidy
cd ../risk-assessment
go mod tidy
cd ../..
```

## Problema: Frontend npm install lento

O build do frontend pode ser lento na primeira vez. Aguarde ou:

```powershell
# Reconstruir apenas frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

## Comando Completo de Limpeza

```powershell
# Parar tudo
docker-compose down -v

# Limpar imagens não utilizadas
docker system prune -a

# Reconstruir tudo do zero
docker-compose build --no-cache

# Subir
docker-compose up -d
```

## Verificar Logs

```powershell
# Ver logs de build
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f api-gateway
```
