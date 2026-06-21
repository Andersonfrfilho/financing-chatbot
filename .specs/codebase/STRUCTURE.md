# Project Structure

**Root:** sakura-bot-oficial (projeto base de referência)

## Directory Tree (sakura-bot-oficial)

```
sakura-bot-oficial/
├── apps/
│   ├── api/                        ← Backend Bun + uWebSockets.js
│   │   ├── src/
│   │   │   ├── index.ts            ← entrypoint
│   │   │   ├── infra/
│   │   │   │   ├── container/      ← DI manual (buildContainer)
│   │   │   │   ├── database/
│   │   │   │   │   ├── connection.ts
│   │   │   │   │   ├── schema/     ← Drizzle table definitions
│   │   │   │   │   └── seeds/
│   │   │   │   ├── http/
│   │   │   │   │   ├── middlewares/ ← authenticate, authorize, validate, rateLimit
│   │   │   │   │   ├── router.ts
│   │   │   │   │   └── server.ts
│   │   │   │   ├── redis/
│   │   │   │   └── websocket/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── audit/
│   │   │   │   ├── cashier/
│   │   │   │   ├── categories/
│   │   │   │   ├── customers/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── delivery/
│   │   │   │   ├── kitchen/
│   │   │   │   ├── orders/
│   │   │   │   ├── products/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   ├── tables/
│   │   │   │   ├── users/
│   │   │   │   └── webhook/
│   │   │   └── shared/
│   │   │       ├── errors/
│   │   │       ├── providers/
│   │   │       └── types/
│   │   ├── drizzle/migrations/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── web/                        ← React + Vite frontend
├── database/
│   ├── schema.sql                  ← schema SQL completo
│   ├── init.sql
│   └── seed_test.sql
├── infra/
│   ├── docker-compose.yml          ← todos os serviços
│   ├── .env.example
│   └── .env
├── n8n/workflows/                  ← workflows n8n exportados
├── src/                            ← lógica do bot (compilada → n8n)
│   ├── handlers/                   ← um handler por estado conversacional
│   ├── shared/
│   │   ├── constants/
│   │   ├── providers/
│   │   └── types/
│   ├── router.ts
│   ├── setup.ts
│   └── teardown.ts
├── scripts/
│   └── build-workflow.js           ← concatena src/ → injeta no workflow n8n
└── Makefile
```

## Estrutura do Novo Projeto (financiamento-imobiliario-bot)

```
financiamento-imobiliario-bot/
├── .specs/                         ← Spec-Driven Development
│   ├── project/
│   │   ├── PROJECT.md
│   │   ├── ROADMAP.md
│   │   └── STATE.md
│   ├── codebase/                   ← brownfield analysis (sakura-bot-oficial)
│   └── features/
│       ├── whatsapp-flow/
│       ├── simulacao-financiamento/
│       ├── open-finance/
│       ├── clientes/
│       ├── leads/
│       └── dashboard/
├── apps/
│   ├── api/                        ← mesmo padrão do sakura-bot-oficial
│   └── web/
├── database/
├── infra/
│   └── docker-compose.yml
├── n8n/workflows/
├── src/                            ← handlers do bot de financiamento
└── Makefile
```

## Where Things Live (sakura-bot-oficial)

**Módulo de domínio:**
- Entidade: `modules/<mod>/domain/entities/`
- Contrato: `modules/<mod>/domain/repositories/`
- Use case: `modules/<mod>/application/use-cases/`
- Controller: `modules/<mod>/infra/http/`
- Repository impl: `modules/<mod>/infra/repositories/`

**Schemas de banco:**
- Definição Drizzle: `apps/api/src/infra/database/schema/<tabela>.ts`
- Schema SQL de referência: `database/schema.sql`

**Configuração de infra:**
- Docker: `infra/docker-compose.yml`
- Env vars: `infra/.env` (baseado em `infra/.env.example`)

**Lógica conversacional:**
- Handlers de estado: `src/handlers/<Handler>.ts`
- Compilado para n8n: `n8n/workflows/01-receber-mensagem.json`
