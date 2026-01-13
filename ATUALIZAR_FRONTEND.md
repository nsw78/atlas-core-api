# 🔄 Como Atualizar o Frontend

## Opção 1: Reconstruir Apenas o Frontend (Recomendado)

```powershell
# Parar o container do frontend
docker-compose stop frontend

# Reconstruir apenas o frontend (sem cache para garantir)
docker-compose build --no-cache frontend

# Subir o frontend novamente
docker-compose up -d frontend
```

## Opção 2: Reconstruir Tudo

```powershell
# Parar tudo
docker-compose down

# Reconstruir tudo (sem cache)
docker-compose build --no-cache

# Subir tudo novamente
docker-compose up -d
```

## Opção 3: Reconstruir e Ver Logs em Tempo Real

```powershell
# Reconstruir e ver logs
docker-compose build --no-cache frontend
docker-compose up -d frontend
docker-compose logs -f frontend
```

## Verificar se Atualizou

1. **Acesse**: http://localhost:3000
2. **Verifique**:
   - Hero section com novo texto
   - Header minimalista
   - Labels atualizados ("Strategic Entity of Interest")
   - Visual mais limpo e executivo

## Se Não Atualizar (Cache do Navegador)

```powershell
# Limpar cache do navegador ou fazer hard refresh
# Chrome/Edge: Ctrl + Shift + R
# Firefox: Ctrl + F5
```

## Ver Logs do Frontend

```powershell
# Ver logs em tempo real
docker-compose logs -f frontend

# Ver últimas 50 linhas
docker-compose logs --tail=50 frontend
```

## Troubleshooting

### Frontend não atualiza visualmente

1. **Hard refresh no navegador**: `Ctrl + Shift + R`
2. **Limpar cache do Docker**: `docker-compose build --no-cache frontend`
3. **Verificar se container está rodando**: `docker-compose ps frontend`

### Erro no build

```powershell
# Ver logs de build
docker-compose build frontend

# Se der erro, limpar tudo e reconstruir
docker-compose down
docker system prune -f
docker-compose build --no-cache frontend
docker-compose up -d frontend
```
