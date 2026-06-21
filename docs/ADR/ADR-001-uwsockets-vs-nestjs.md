# ADR-001: uWebSockets.js em vez de NestJS

**Status:** Aceito  
**Data:** 2026-06-19  
**Autores:** Time de desenvolvimento

---

## Contexto

A especificação inicial mencionava NestJS como opção de framework HTTP. O projeto base (`sakura-bot-oficial`) usa uWebSockets.js com um roteador customizado, Drizzle ORM e Bun como runtime.

## Decisão

Adotar uWebSockets.js (uWS) + Drizzle + Bun, mantendo arquitetura idêntica ao `sakura-bot-oficial`.

## Motivação

- **Consistência:** toda a equipe já conhece os padrões do projeto base; zero overhead de aprendizado
- **Performance:** uWS tem throughput significativamente maior que Express/Fastify para WebSocket, essencial para o canal em tempo real do painel
- **Sem abstrações desnecessárias:** NestJS introduz IoC container, decorators e camadas que não trazem benefício concreto para v1 desta escala
- **Velocidade de desenvolvimento:** reaproveitamento direto de middlewares (`authenticate`, `authorize`, `validateBody`) e patterns do projeto base

## Consequências

- A API usa um `Router` customizado sobre `uWS.App()` em vez de um framework convencional
- Body parsing feito manualmente (sem `body-parser`)
- Injeção de dependência feita manualmente via `buildContainer()` em vez de IoC automático
- TypeScript estrito (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) exige `request.params['id']!` com non-null assertion

## Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| NestJS | Overhead arquitetural sem benefício para v1; divergência com projeto base |
| Fastify | Sem suporte nativo a WebSocket com performance de uWS |
| Hono | Ecosistema menor; sem histórico no projeto |
