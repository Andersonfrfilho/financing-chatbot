# Codebase Concerns

**Source:** sakura-bot-oficial — avaliado em 2026-06-19

## [HIGH] uWebSockets.js vs NestJS

**Evidência:** `apps/api/src/infra/http/server.ts` usa `uWS.App()` diretamente.
**Conflito:** `especificacoes.md` pede NestJS.
**Impacto:** Todo o padrão de rotas, middlewares e DI difere completamente.
**Fix:** Decisão arquitetural documentada no ADR — manter uWS + Drizzle para consistência com o base.

## [HIGH] Ausência de testes automatizados no projeto base

**Evidência:** `tests/flow.test.js` existe mas sem testes unitários de use cases, schemas ou handlers.
**Impacto:** Cálculos financeiros (SAC/PRICE) sem cobertura de testes = risco alto em produção.
**Fix:** Escrever suíte de testes unitários para toda a lógica de simulação antes de deploy.

## [MEDIUM] Tenant isolation: `establishmentId` hardcoded vs JWT

**Evidência:** `tenantIsolation.ts` middleware extrai `establishmentId` do JWT.
**Risco:** Se webhook chegar sem contexto de establishment (ex: número não cadastrado), use case pode falhar silenciosamente.
**Fix:** `FindOrCreateCustomerUseCase` deve validar se `establishmentId` existe antes de criar.

## [MEDIUM] n8n como ponto único de falha conversacional

**Evidência:** Todo estado de conversa vive no n8n (Redis/Postgres do n8n).
**Risco:** Restart do n8n perde estado de conversas ativas.
**Fix:** Persistir estado de sessão do bot no PostgreSQL da aplicação para resiliência.

## [MEDIUM] Open Finance — URLs de bancos não mapeadas

**Evidência:** Nenhuma URL concreta de Open Finance implementada ainda.
**Risco:** Cada banco tem URL base diferente; algumas podem estar offline ou com schema diferente.
**Fix:** Criar health check das URLs antes de usar em produção; fallback para taxas cacheadas.

## [LOW] Docker Compose sem limites de recursos

**Evidência:** `infra/docker-compose.yml` sem `mem_limit` ou `cpus`.
**Impacto:** Metabase ou Chatwoot podem consumir toda a memória em produção.
**Fix:** Adicionar limites no compose de produção.

## [LOW] Secrets em .env sem rotação

**Evidência:** `JWT_SECRET`, `WEBHOOK_SECRET` como strings simples em `.env`.
**Fix:** Usar Docker secrets ou vault em produção; `.env` apenas para desenvolvimento local.

## [INFO] Sem Prisma — Drizzle ORM é o padrão

A spec menciona "Prisma ou TypeORM" mas o projeto usa Drizzle. Manter Drizzle.
Motivo: já está em produção no projeto base, migrations geradas, equipe familiarizada.
