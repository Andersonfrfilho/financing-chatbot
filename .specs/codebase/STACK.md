# Tech Stack

**Analyzed:** 2026-06-19
**Source:** sakura-bot-oficial (projeto base a ser reaproveitado)

## Core

- Runtime: Bun (v1.x)
- Language: TypeScript ~5.7.3
- Package Manager: Bun workspaces
- Monorepo: workspace com `apps/api` e `apps/web`

## Backend (apps/api)

- HTTP Server: uWebSockets.js v20.51.0 (não Express/Fastify/NestJS)
- ORM: Drizzle ORM ^0.36.4
- Database: PostgreSQL 16 via pgvector/pgvector:pg16
- Cache: Redis 7 + ioredis ^5.4.1
- Auth: jose ^5.9.6 (JWT / RS256)
- Password: argon2 ^0.44.0
- Validation: zod ^3.24.1
- WebSocket: uWS nativo + Redis pub/sub para broadcast entre instâncias
- API Docs: Scalar (HTML inline) + openapi-types

## Infraestrutura (Docker Compose)

- WhatsApp Gateway: Meta Cloud API (graph.facebook.com) — sem Evolution API
- Orquestração de fluxos: n8n (latest) com PostgreSQL como backend
- Atendimento humano: Chatwoot (latest)
- Chatbot builder: Typebot builder + viewer
- Admin headless: Directus (latest) com pgvector
- Analytics: Metabase (latest)
- DB Admin: Adminer

## Frontend (apps/web)

- Framework: React + Vite
- Dev port: 4000
- API URL: VITE_API_URL / VITE_API_WS_URL (env vars)

## Testing

- Framework: `bun test` (built-in)
- Localização: `tests/` na raiz + `apps/api/src/**/*.test.ts`
- Script de flow: `tests/flow.test.js`

## Build & Deploy

- Deploy target: Railway (`railway.toml` em apps/api e raiz)
- Container: Docker + Docker Compose
- Migrations: `drizzle-kit generate` + `drizzle-kit migrate`
- Hot reload dev: `bun --hot run src/index.ts`

## Observação crítica

A spec `especificacoes.md` menciona NestJS, mas o projeto base usa **uWebSockets.js** diretamente.
O novo projeto seguirá o padrão do projeto base (uWS + Drizzle + Bun) para consistência arquitetural.
