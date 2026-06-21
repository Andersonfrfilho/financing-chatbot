# Spec: Milestone 1 — Fundação

**Status:** Implementado — aguardando `make up` para validação
**Escopo:** F-001, F-002, F-003, F-004

---

## F-001: Scaffold do Projeto

### Requisitos

| ID | Requisito |
|----|-----------|
| R-001-1 | Monorepo com Bun workspaces (`apps/api`, `apps/web`) |
| R-001-2 | Docker Compose com todos os serviços necessários |
| R-001-3 | Makefile com comandos: `setup`, `up`, `down`, `logs`, `db-reset`, `build` |
| R-001-4 | `.env.example` com todas as variáveis necessárias |
| R-001-5 | `tsconfig.json` com paths aliases (`@/` → `src/`) |
| R-001-6 | `drizzle.config.ts` para geração de migrations |

---

## F-002: Schema do Banco de Dados

### Entidades

| ID | Entidade | Descrição |
|----|----------|-----------|
| R-002-1 | `users` | Equipe interna (atendimento, comercial, admin) |
| R-002-2 | `roles` + `permissions` | RBAC: perfis e permissões por recurso/ação |
| R-002-3 | `financing_clients` | Clientes captados pelo bot (dados pessoais + financeiros) |
| R-002-4 | `banks` | Bancos participantes com URL Open Finance |
| R-002-5 | `bank_rates` | Cache de taxas por banco/modalidade (Open Finance Fase 1) |
| R-002-6 | `financing_simulations` | Simulações realizadas (parâmetros de entrada) |
| R-002-7 | `simulation_results` | Resultados por banco/sistema (SAC/PRICE) |
| R-002-8 | `leads` | Funil de vendas com status e assignee |
| R-002-9 | `conversation_sessions` | Estado da conversa WhatsApp (retomada) |
| R-002-10 | `audit_logs` | Auditoria de ações críticas |

### Regras de dados

| ID | Regra |
|----|-------|
| R-002-11 | CPF armazenado criptografado (AES-256) — LGPD |
| R-002-12 | `monthly_income`, `family_income`, `fgts_amount`, `down_payment_amount` criptografados |
| R-002-13 | Soft delete em `financing_clients` (campo `deleted_at`) |
| R-002-14 | UUID v4 como PK em todas as tabelas |
| R-002-15 | `created_at` + `updated_at` em todas as tabelas |

---

## F-003: Módulo de Autenticação

### Requisitos

| ID | Requisito |
|----|-----------|
| R-003-1 | `POST /auth/login` — valida email/senha, retorna access + refresh token |
| R-003-2 | `POST /auth/refresh` — renova access token via refresh token |
| R-003-3 | `POST /auth/logout` — invalida refresh token no Redis |
| R-003-4 | Access token: JWT HS256, TTL 15 min |
| R-003-5 | Refresh token: JWT HS256, TTL 7 dias, salvo no Redis |
| R-003-6 | Senha hasheada com argon2 |
| R-003-7 | Middleware `authenticate` — valida JWT e injeta `userId` + `role` no contexto |
| R-003-8 | Middleware `authorize(resource, action)` — valida permissão RBAC |

---

## F-004: Infraestrutura Base da API

### Requisitos

| ID | Requisito |
|----|-----------|
| R-004-1 | Servidor uWebSockets.js na porta configurável (padrão 3333) |
| R-004-2 | Router class com métodos `get`, `post`, `put`, `patch`, `delete` |
| R-004-3 | CORS para origins configuráveis via `ALLOWED_ORIGINS` |
| R-004-4 | Health check `GET /health` |
| R-004-5 | Middleware `validateBody(schema)` com Zod |
| R-004-6 | Redis Provider com métodos: `get`, `set`, `del`, `exists`, `setex` |
| R-004-7 | WebSocket Hub para broadcast em tempo real por `establishmentId` |
| R-004-8 | Container DI manual (`buildContainer`) — mesma abordagem do base |
| R-004-9 | `AppError` base + erros tipados: `UnauthorizedError`, `ConflictError`, `NotFoundError`, `ValidationError` |
| R-004-10 | Migrations automáticas no bootstrap da API |

---

## Critérios de Aceitação do Milestone 1

- [ ] `make up` sobe todos os containers sem erros
- [ ] `GET /health` retorna `{ status: "ok" }`
- [ ] `POST /auth/login` com credenciais válidas retorna tokens
- [ ] `POST /auth/login` com credenciais inválidas retorna 401
- [ ] Schema migrado no PostgreSQL com todas as 10 tabelas
- [ ] Redis conectando corretamente
- [ ] TypeScript sem erros de tipo (`bun run typecheck`)
