# Infraestrutura — financiamento-imobiliario-bot

## Visão Geral

| Componente | Tipo | Plataforma | Custo estimado |
|------------|------|-----------|---------------|
| PostgreSQL | Component nativo | Railway | ~$2–3/mês |
| Redis | Component nativo | Railway | ~$0,50/mês |
| API (Bun) | Serviço (Dockerfile) | Railway | ~$2–3/mês |
| n8n | Serviço (Docker Image) | Railway | ~$1–2/mês (Serverless) |
| Web (React + Nginx) | Deploy estático | Vercel | $0 |

**Total estimado: $5–8/mês**

> pgvector não é usado no código atual — component nativo do Railway é suficiente.

---

## Novo Projeto Railway

**Nome:** `financiamento-imobiliario-bot`

---

### Component 1 — PostgreSQL

- Adicionar via **"+ New" → "Database" → "PostgreSQL"**
- Railway injeta `DATABASE_URL` automaticamente em todos os serviços do projeto

---

### Component 2 — Redis

- Adicionar via **"+ New" → "Database" → "Redis"**
- Railway injeta `REDIS_URL` automaticamente em todos os serviços do projeto

---

### Serviço 3 — API

| Campo | Valor |
|-------|-------|
| Source | GitHub repo (monorepo) |
| Root Directory | `apps/api` |
| Dockerfile | `apps/api/Dockerfile` |
| Start Command | `bun run dist/index.js` |
| Healthcheck | `GET /health` |
| Restart Policy | On Failure (max 3x) |
| Serverless | ❌ Desativado (WebSocket ativo) |

**Variáveis de ambiente:**
```
PORT=3333
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}         # referência automática Railway
REDIS_URL=${{Redis.REDIS_URL}}                  # referência automática Railway
JWT_SECRET=                                     # openssl rand -hex 32
JWT_REFRESH_SECRET=                             # openssl rand -hex 32
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=                                 # openssl rand -hex 32
API_INTERNAL_TOKEN=                             # openssl rand -hex 32
ALLOWED_ORIGINS=                                # URL do Vercel (definir após deploy web)
WHATSAPP_ACCESS_TOKEN=                          # Meta Developer Console
WHATSAPP_PHONE_NUMBER_ID=                       # Meta Developer Console
WHATSAPP_BUSINESS_ACCOUNT_ID=                  # Meta Developer Console
WHATSAPP_WEBHOOK_VERIFY_TOKEN=                  # string livre de sua escolha
WHATSAPP_API_VERSION=v21.0
WHATSAPP_CATALOG_ID=                            # Meta Commerce Manager — necessário para sincronizar categorias/produtos
LOG_LEVEL=info
```

**Domínio público:**
```
https://financiamento-api.up.railway.app
```

---

### Serviço 4 — n8n

| Campo | Valor |
|-------|-------|
| Source | Docker Image |
| Image | `n8nio/n8n:latest` |
| Porta | 5678 |
| Volume | `/home/node/.n8n` |
| Serverless | ✅ Ativado (dorme sem tráfego) |
| Restart Policy | On Failure (max 10x) |

**Variáveis de ambiente:**
```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=                        # senha forte
N8N_HOST=                                       # domínio Railway gerado
WEBHOOK_URL=                                    # https://[domínio].up.railway.app
GENERIC_TIMEZONE=America/Sao_Paulo
TZ=America/Sao_Paulo
N8N_LOG_LEVEL=info
WHATSAPP_ACCESS_TOKEN=                          # mesmo da API
WHATSAPP_PHONE_NUMBER_ID=                       # mesmo da API
WHATSAPP_WEBHOOK_VERIFY_TOKEN=                  # mesmo da API
WHATSAPP_API_VERSION=v21.0
API_BASE_URL=                                   # URL pública da API
API_INTERNAL_TOKEN=                             # mesmo da API
```

**Domínio público:**
```
https://financiamento-n8n.up.railway.app
```

---

## Vercel — Web

**O que configurar:**
- Conectar repositório GitHub
- Root Directory: `apps/web`
- Framework: `Vite`
- Build Command: `bun run build`
- Output Directory: `dist`

**Variáveis de ambiente:**
```
VITE_API_URL=https://financiamento-api.up.railway.app
VITE_API_WS_URL=wss://financiamento-api.up.railway.app
```

---

## Ordem de Setup

```
1. Railway  → criar projeto "financiamento-imobiliario-bot"
2. Railway  → adicionar component PostgreSQL
3. Railway  → adicionar component Redis
4. Railway  → adicionar serviço API (DATABASE_URL e REDIS_URL já injetados)
5. Railway  → adicionar serviço n8n + volume + ativar Serverless
6. Vercel   → conectar repo + configurar vars + deploy
7. Railway  → atualizar ALLOWED_ORIGINS da API com URL do Vercel
8. Meta     → configurar webhook URL do n8n no WhatsApp Business
```

---

## Geração de Secrets

```bash
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # JWT_REFRESH_SECRET
openssl rand -hex 32  # ENCRYPTION_KEY
openssl rand -hex 32  # API_INTERNAL_TOKEN
```
