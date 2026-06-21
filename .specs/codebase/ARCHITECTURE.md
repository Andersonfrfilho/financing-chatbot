# Architecture

**Pattern:** Monorepo Modular DDD + Clean Architecture
**Source:** sakura-bot-oficial/apps/api

## High-Level Structure

```
WhatsApp Client
      │
      ▼
Meta Cloud API (graph.facebook.com)
      │ POST webhook (HTTPS)
      ▼
n8n [:5678]  ──────────────────────► Groq / LLM (IA conversacional)
      │
      ▼
API Backend (uWS :3333)
  ├── WebhookModule        ← recebe eventos WhatsApp
  ├── CustomersModule      ← find-or-create por número WA
  ├── [feature modules]
  │
  ├── PostgreSQL [:5432]   ← dados persistentes
  ├── Redis [:6379]        ← cache, sessão, WS pub/sub
  └── WebSocketHub         ← broadcast em tempo real
        │
        ▼
React Frontend [:4000]    ← painéis operacionais em tempo real
```

## Identified Patterns

### Modular DDD com Clean Architecture

**Location:** `apps/api/src/modules/<module>/`

**Estrutura interna de cada módulo:**
```
<module>/
  application/
    use-cases/
      XxxUseCase.ts         ← orquestração, regra de aplicação
  domain/
    entities/
      Xxx.ts                ← interfaces TypeScript (sem classes)
    repositories/
      XxxRepository.ts      ← contrato/interface do repositório
  infra/
    http/
      XxxController.ts      ← parse req/res, delega ao use case
      XxxRoutes.ts          ← registra rotas no Router
    repositories/
      DrizzleXxxRepository.ts ← implementação com Drizzle ORM
```

**Exemplo:**
- `modules/customers/domain/repositories/CustomerRepository.ts` → interface
- `modules/customers/infra/repositories/DrizzleCustomerRepository.ts` → implementação Drizzle

### Container / Dependency Injection Manual

**Location:** `apps/api/src/infra/container/index.ts`

Sem framework de DI. Tudo construído manualmente em `buildContainer(wsHub)`:
```typescript
const userRepository = new DrizzleUserRepository(db)
const loginUseCase = new LoginUseCase(userRepository, cache)
const authController = new AuthController(loginUseCase, ...)
```

O container é construído uma vez no bootstrap e injetado nas rotas via closures.

### Use Cases como Classes com execute()

```typescript
export class CreateOrderUseCase {
  constructor(private readonly db: Database, private readonly wsHub: WebSocketHub) {}
  async execute(input: CreateOrderInput) { ... }
}
```

Convenção universal: todas as use cases têm método `execute(input)` com tipo próprio.

### Repository Pattern

Interface em `domain/repositories/`, implementação em `infra/repositories/`:
```typescript
// Contrato
export interface CustomerRepository {
  findByWhatsApp(number: string, estId: string): Promise<Customer | null>
}
// Implementação
export class DrizzleCustomerRepository implements CustomerRepository { ... }
```

### Tenant Isolation via establishmentId

**Todo** recurso é isolado por `establishmentId` (UUID).
Middleware `tenantIsolation.ts` injeta o `establishmentId` de contexto JWT.
Queries sempre filtram: `.where(eq(schema.table.establishmentId, establishmentId))`.

### WebSocket Broadcasting

`WebSocketHub` usa Redis pub/sub para broadcast entre instâncias:
```typescript
await this.wsHub.publishBroadcast(establishmentId, WS_EVENTS.ORDER_CREATED, payload)
```

## Data Flow

### Fluxo WhatsApp → Banco de Dados

```
1. Meta envia POST para /api/webhook/whatsapp
2. WebhookController valida HMAC (X-Hub-Signature-256)
3. Replay protection via nonce no Redis (TTL 5min)
4. ReceiveWhatsAppWebhookUseCase processa mensagens
5. FindOrCreateCustomerUseCase: upsert do customer por número WA
6. n8n recebe eventos e gerencia estado conversacional
7. Dados salvos no PostgreSQL
```

### Fluxo de Autenticação

```
1. POST /auth/login → LoginUseCase
2. Valida senha com argon2.verify()
3. Gera access token (15m) + refresh token (7d) via jose
4. Refresh token salvo no Redis com TTL
5. Logout: remove refresh token do Redis
```

## Code Organization

**Approach:** Feature-based (módulos de domínio)

**Separação camadas:**
- `domain/` → sem dependências externas (zero imports de infra)
- `application/` → depende só de domain
- `infra/` → depende de application + domain + libs externas

**Shared code:** `apps/api/src/shared/`
```
shared/
  errors/AppError.ts     ← ConflictError, UnauthorizedError, etc.
  providers/             ← CacheProvider interface
  types/                 ← tipos compartilhados (OrderType, etc.)
```
