# Guia de Deploy

## Pré-requisitos

- Docker 24+ e Docker Compose V2
- Conta Meta Business com WhatsApp Cloud API habilitada
- Domínio público com HTTPS (para webhook Meta)
- Bun 1.1+ (para desenvolvimento local)

## Configuração Inicial

### 1. Clone e variáveis de ambiente

```bash
git clone <repo>
cd financiamento-imobiliario-bot
cp infra/.env.example infra/.env
# Edite infra/.env com seus valores
```

### 2. Variáveis obrigatórias

```bash
# Banco de dados
POSTGRES_USER=financiamento
POSTGRES_PASSWORD=<senha-forte>
POSTGRES_DB=financiamento_bot

# Redis
REDIS_PASSWORD=<senha-forte>

# JWT (gere com: openssl rand -hex 32)
JWT_SECRET=<64-chars-hex>
JWT_REFRESH_SECRET=<64-chars-hex>

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=<token-meta>
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token-aleatorio>
WHATSAPP_API_VERSION=v19.0
WHATSAPP_CATALOG_ID=<catalog-id-meta-commerce-manager>  # necessário para sincronizar categorias/produtos

# Criptografia LGPD (gere com: openssl rand -hex 32)
ENCRYPTION_KEY=<64-chars-hex>

# URLs internas
API_BASE_URL=http://financiamento-api:3333
```

### 3. Subir infraestrutura

```bash
# Sobe todos os serviços
make up

# Aguarda banco e aplica migrations
make db-reset

# Seed com dados iniciais (bancos, roles, admin)
make db-seed
```

## Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| PostgreSQL | 5432 | Banco de dados principal |
| Redis | 6379 | Cache e sessões |
| API | 3333 | Backend uWebSockets.js |
| Web | 5173 | Frontend React (dev) |
| n8n | 5678 | Workflow engine |
| Adminer | 8080 | GUI do banco (dev) |
| Metabase | 3000 | BI e relatórios |

## Configurar Webhook Meta

1. No [Meta Developer Console](https://developers.facebook.com), vá em WhatsApp > Configuration
2. Webhook URL: `https://seu-dominio.com/api/webhook/whatsapp`
3. Verify Token: valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Subscribe aos campos: `messages`

## Importar Workflow n8n

1. Acesse `http://localhost:5678`
2. Vá em Workflows > Import from file
3. Selecione `n8n/workflows/01-bot-financiamento.json`
4. Configure as credenciais: PostgreSQL e variáveis de ambiente
5. Ative o workflow

## Comandos Úteis

```bash
make up          # Sobe todos os serviços
make down        # Para todos os serviços
make logs        # Logs em tempo real
make typecheck   # Verifica tipos TypeScript
make test        # Roda testes
make db-reset    # Recria banco e aplica migrations
make db-seed     # Popula dados iniciais
make urls        # Lista URLs de acesso
```

## Monitoramento

- **Logs da API**: `docker compose logs -f financiamento-api`
- **Logs do n8n**: `docker compose logs -f n8n`
- **Métricas**: Metabase em `http://localhost:3000`
- **WebSocket**: Dashboard → Sessões mostra sessões ativas em tempo real
