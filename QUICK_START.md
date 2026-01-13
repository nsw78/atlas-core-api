# ⚡ Quick Start - ATLAS no Docker Desktop

## 🚀 Comando Único para Subir Tudo

```powershell
# No PowerShell, no diretório do projeto
docker-compose up --build -d
```

**Aguarde 5-10 minutos** (primeira vez baixa as imagens)

## ✅ Verificar se Está Rodando

```powershell
docker-compose ps
```

## 🌐 Acessar o Frontend

Abra no navegador: **http://localhost:3000**

## 🔄 Atualizar Frontend (Após Mudanças)

```powershell
# Reconstruir apenas frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

Veja [ATUALIZAR_FRONTEND.md](ATUALIZAR_FRONTEND.md) para mais detalhes.

## 📋 URLs dos Serviços

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Grafana**: http://localhost:3001 (admin/admin)

## 🛑 Parar Tudo

```powershell
docker-compose down
```

## 🐛 Se Der Erro no Build

Se o build do frontend falhar, tente:

```powershell
# Limpar tudo e reconstruir
docker-compose down -v
docker-compose build --no-cache frontend
docker-compose up -d
```

## 📖 Guia Completo

Veja [GUIA_DOCKER.md](GUIA_DOCKER.md) para instruções detalhadas, troubleshooting e mais comandos.

---

**Pronto! 🎉**
