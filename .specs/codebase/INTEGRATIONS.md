# External Integrations

**Source:** sakura-bot-oficial

## WhatsApp

**Service:** Meta Cloud API (graph.facebook.com)
**Purpose:** Canal de comunicação com clientes via WhatsApp Business
**Implementation:** Webhook recebido pela API; envio via HTTP para Meta
**Authentication:** Bearer token (WHATSAPP_ACCESS_TOKEN)
**Webhook security:** HMAC-SHA256 (X-Hub-Signature-256)

**Enviar mensagem:**
```
POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
```

**Tipos de mensagem usados:**
- `text` → mensagens simples
- `interactive/button` → até 3 botões de resposta rápida
- `interactive/list` → listas de opções

**Env vars:**
```
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN
WHATSAPP_API_VERSION=v21.0
```

## n8n

**Service:** n8n (self-hosted, Docker)
**Purpose:** Orquestração de fluxos conversacionais, integração com LLM, lógica de estado do bot
**Port:** 5678
**Authentication:** Basic Auth (N8N_USER / N8N_PASSWORD)
**Database:** PostgreSQL (banco separado `n8n`)
**Webhook:** Recebe POST da Meta Cloud API

**Padrão:**
- Workflows exportados em `n8n/workflows/` como JSON
- Código TypeScript em `src/handlers/` compilado e injetado no workflow via `build-workflow.js`
- **Nunca** editar o JSON do workflow diretamente

## Groq / LLM

**Service:** Groq API (ou outro LLM configurável)
**Purpose:** Processamento de linguagem natural nas conversas
**Integration:** Via n8n (nó HTTP Request ou nó nativo Groq)

## PostgreSQL

**Service:** PostgreSQL 16 com extensão pgvector
**Purpose:** Dados persistentes de todos os serviços
**Bancos separados por serviço:**
- `${POSTGRES_DB}` → aplicação principal + Directus
- `n8n` → dados do n8n
- `chatwoot` → dados do Chatwoot
- `typebot` → dados do Typebot
- `metabase` → dados do Metabase
**ORM:** Drizzle ORM (no app backend)
**Migrations:** `drizzle-kit generate` + `drizzle-kit migrate`

## Redis

**Service:** Redis 7 Alpine
**Purpose:** Cache de dados quentes, sessões JWT (refresh tokens), nonces de webhook, WebSocket pub/sub
**Client:** ioredis
**Port:** 6379

## Chatwoot

**Service:** Chatwoot (self-hosted, Docker)
**Purpose:** Handoff para atendimento humano quando bot não consegue resolver
**Port:** 3010
**Integration:** Via n8n (webhook ou API REST do Chatwoot)

## Directus

**Service:** Directus (self-hosted, Docker)
**Purpose:** Painel admin headless para gestão de dados (cardápio, configurações, etc.)
**Port:** 8055
**Authentication:** Directus nativo + OAuth opcional (Keycloak)
**WebSockets:** Habilitado (WEBSOCKETS_ENABLED=true)

## Typebot

**Service:** Typebot Builder + Viewer (self-hosted, Docker)
**Purpose:** Construção visual de fluxos de chatbot
**Ports:** Builder :3001, Viewer :3002
**Database:** PostgreSQL banco `typebot`

## Metabase

**Service:** Metabase (self-hosted, Docker)
**Purpose:** Analytics e dashboards para gestores
**Port:** 4100
**Database:** PostgreSQL banco `metabase`

---

## Open Finance Brasil (Integração Futura — novo projeto)

**Tier 1 — Dados Abertos (sem autenticação):**
```
GET https://<host-banco>/open-banking/products-services/v1/personal-financing
GET https://<host-banco>/opendata-financings/v1/personal-financings
```
Sem cadastro necessário. Retorna taxas, produtos e condições por banco.

**Bancos prioritários:**
| Banco | Status API Open Finance | Prioridade |
|-------|------------------------|-----------|
| Caixa Econômica | Participante obrigatório | Alta |
| Santander | Participante obrigatório | Alta |
| Banco do Brasil | Portal Developers próprio | Alta |
| Itaú | Participante obrigatório | Média |
| Bradesco | Participante obrigatório | Média |

**Tier 2 — Dados Personalizados (OAuth 2.0 + consentimento):**
Requer certificação como Participante no BCB. Fora do escopo v1.

**Hubs intermediadores (alternativa à certificação):**
- Tecnospeed Open Finance
- Belvo
- Quanto
