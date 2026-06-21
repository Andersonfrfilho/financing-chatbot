# Code Conventions

**Source:** sakura-bot-oficial/apps/api

## Naming Conventions

**Files:**
- PascalCase para classes e interfaces: `CreateOrderUseCase.ts`, `DrizzleCustomerRepository.ts`
- kebab-case para arquivos de infra/config: `docker-compose.yml`, `order-items.ts` (schemas Drizzle)
- Sufixos descritivos obrigatórios: `UseCase`, `Repository`, `Controller`, `Routes`, `Provider`, `Implementation`

**Classes/Interfaces:**
- Use cases: `VerbNounUseCase` → `CreateOrderUseCase`, `FindOrCreateCustomerUseCase`
- Repositories (interface): `NounRepository` → `CustomerRepository`, `UserRepository`
- Repositories (impl): `DrizzleNounRepository` → `DrizzleCustomerRepository`
- Controllers: `NounController` → `OrderController`, `AuthController`
- Providers (interface): sem prefixo `I` → `CacheProvider`, `GeocodingProvider`
- Providers (impl): `NounProviderImplementation` → `NominatimProviderImplementation`

**Variables:**
- Sem diminutivos: `product` (não `p`), `paymentType` (não `pt`), `establishment` (não `est`)
- camelCase descritivo: `findOrCreateCustomerUseCase`, `updateOrderStatusUseCase`

**Constants:**
- SCREAMING_SNAKE_CASE para constantes de módulo: `WEBHOOK_SECRET`, `NONCE_TTL_SECONDS`
- Objetos constantes em PascalCase: `WS_EVENTS`, `MessagesConstants`

## Type Safety

**Regra:** Sem `any`. Usar `interfaces` tipadas ou `unknown` + type guard.

**Entidades de domínio:** Sempre interfaces TypeScript (não classes):
```typescript
export interface UserEntity {
  id: string
  establishmentId: string
  name: string
  // ...
}
```

**Tipos de schema Drizzle:** Inferidos diretamente do schema:
```typescript
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
```

**Input de use cases:** Interface local no arquivo do use case:
```typescript
interface CreateOrderInput {
  establishmentId: string
  items: CreateOrderItemInput[]
  // ...
}
```

## Error Handling

**Pattern:** Custom error classes em `shared/errors/AppError.ts`:
```typescript
throw new UnauthorizedError('invalid_webhook_signature')
throw new ConflictError('Order must have at least one item')
```

Sem try/catch genérico nos use cases — erros propagam para o controller/middleware de erros.

## Import Style

- Aliases com `@/` para imports internos: `import * as schema from '@/infra/database/schema'`
- Named imports preferidos: `import { eq, count } from 'drizzle-orm'`
- Type imports explícitos: `import type { NodePgDatabase } from 'drizzle-orm/node-postgres'`

## Strings de UI

Toda string exibida ao usuário vai em constants, nunca inline:
```typescript
// ✅ Correto
import { MessagesConstants } from '@/shared/constants/MessagesConstants'
// ❌ Errado
text.body = "Olá! Como posso ajudar?"
```

## Comments

Mínimos. Apenas quando o WHY não é óbvio:
```typescript
// Idempotency: skip duplicate webhook deliveries
// Only handle interactive button replies for now — text parsing is handled by n8n/AI
// Replay protection via nonce
```

## Routes Registration

Padrão de função `register*Routes`:
```typescript
export function registerOrderRoutes(router: Router, controller: OrderController) {
  router.post('/api/orders', (req, res) => controller.create(req, res))
}
```
