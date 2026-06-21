# ADR-003: Drizzle ORM em vez de Prisma/TypeORM

**Status:** Aceito  
**Data:** 2026-06-19  
**Autores:** Time de desenvolvimento

---

## Contexto

A especificação original mencionava "Prisma ou TypeORM" como opções de ORM. O projeto base (`sakura-bot-oficial`) usa Drizzle ORM com schema-first approach e migrations via `drizzle-kit`.

## Decisão

Manter **Drizzle ORM** conforme o projeto base.

## Motivação

- **Padrão estabelecido:** já em uso no projeto base com equipe familiarizada; zero custo de migração de conhecimento
- **Schema-first com TypeScript nativo:** o schema é definido em `.ts` e serve como fonte de verdade tanto para migrations quanto para tipos — sem step de geração de código
- **Performance:** Drizzle gera SQL direto sem overhead de ORM pesado; queries complexas podem usar `sql` template literal
- **Type safety sem geração:** `typeof schema.$inferSelect` e `typeof schema.$inferInsert` dão tipos completos sem precisar rodar `prisma generate`
- **Compatibilidade com Bun:** Drizzle + `drizzle-orm/node-postgres` funciona com Bun sem adaptadores extras

## Exemplo de padrão adotado

```typescript
// Schema como fonte de verdade
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: leadStatusEnum('status').default('new').notNull(),
  // ...
})

// Tipos gerados automaticamente
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert

// Query type-safe
const result = await db.query.leads.findMany({
  with: { client: true, simulation: true },
  where: eq(leads.status, 'new'),
})
```

## Consequências

- Migrations geradas via `bunx drizzle-kit generate`; aplicadas via `bunx drizzle-kit migrate`
- Relations definidas em `schema/relations.ts` usando `relations()` helper
- Queries raw quando necessário via `sql` template literal (ex: `sql\`extract(month from ${table.createdAt})\``)

## Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Prisma | Requer step de geração (`prisma generate`); schema em `.prisma` separado do TS; mais pesado para runtime |
| TypeORM | Decorators + classes; pior integração com Bun; padrão diferente do projeto base |
| Kysely | Sem migrations integradas; mais verboso para schemas complexos |
| SQL puro | Sem type safety; migrations manuais; maior risco de erro |
