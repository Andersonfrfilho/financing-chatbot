# State

**Última atualização:** 2026-06-19

## Decisões

### ADR-001: Manter uWebSockets.js em vez de NestJS

**Decisão:** Usar uWS + Drizzle + Bun (igual ao sakura-bot-oficial), ignorando a menção a NestJS na spec.
**Motivo:** Consistência arquitetural com o projeto base; NestJS traria overhead de aprendizado e divergência de padrões sem benefício concreto para v1.
**Data:** 2026-06-19

### ADR-002: Open Finance Fase 1 apenas para v1

**Decisão:** Usar exclusivamente as APIs de dados abertos do Open Finance (sem autenticação) para v1.
**Motivo:** Certificação como Participante BCB requer 3-12 meses e a instituição precisa ser autorizada pelo Banco Central.
**Alternativa futura:** Hub intermediador (Tecnospeed, Belvo) ou certificação própria.
**Data:** 2026-06-19

### ADR-003: Drizzle ORM em vez de Prisma/TypeORM

**Decisão:** Manter Drizzle ORM conforme projeto base.
**Motivo:** Já em uso no projeto base, migrations geradas, equipe familiarizada. Spec menciona "Prisma ou TypeORM" mas sem razão técnica para trocar.
**Data:** 2026-06-19

### ADR-005: Sistema multi-modalidade de financiamento

**Decisão:** O bot suporta múltiplas modalidades de financiamento, não apenas imobiliário. O usuário escolhe a modalidade no primeiro passo do fluxo conversacional (`awaiting_financing_type`).
**Motivo:** Requisito do usuário — corretores e correspondentes bancários trabalham com imóveis, veículos, consignado, crédito pessoal, PJ, etc.
**Impacto no schema:** `financing_simulations` tem campo `financing_type` obrigatório + campos opcionais por modalidade + `metadata` JSONB para extensibilidade.
**Impacto no bot:** Fluxo conversacional ramificado por `financing_type` após coleta de dados pessoais comuns.
**Data:** 2026-06-19

### ADR-006: Motor de simulação Caixa — cálculo local (sem web scraping)

**Decisão:** Implementar SAC com parâmetros extraídos do bundle Angular da Caixa, sem automação do simulador web.
**Motivo:** Análise 2026-06-26 confirmou que:
- `habitacao.caixa.gov.br` está atrás de ShieldSquare (bot protection)
- `portaldeempreendimentos.caixa.gov.br/simulador/` usa Apache Tapestry com form state HMAC assinado
- `app.novosimulador.caixa.gov.br/api/v1/` requer SSO Keycloak interno (inacessível)
- A Caixa faz os cálculos **client-side**: todos os parâmetros estão no bundle Angular (versão 1.15.12.0)
**Fonte dos dados:** `simuladorhabitacao.caixa.gov.br/main.4404e704734ce83c.js`
**Risco:** Parâmetros podem mudar quando Caixa atualizar o bundle. Mitigação: job diário de check de hash (CAIXA-21).
**Data:** 2026-06-26

### ADR-004: Criptografia de dados sensíveis

**Decisão:** CPF, renda e dados financeiros criptografados em repouso usando AES-256.
**Motivo:** LGPD — dados pessoais sensíveis (financeiros) exigem proteção adicional.
**Implementação:** Campo criptografado na camada de repositório antes de persistir.
**Data:** 2026-06-19

---

## Bloqueios

_Nenhum bloqueio ativo._

---

## Pendências

- [ ] Confirmar qual corretor/estabelecimento é o cliente piloto
- [x] Mapear URLs concretas de Open Finance para Caixa — **resolvido:** Caixa não usa Open Finance para simulação; cálculo é local com parâmetros do bundle Angular (ver ADR-006)
- [ ] Mapear URLs Open Finance para Santander, BB, Itaú
- [ ] Definir se o projeto será multi-tenant v1 ou single-tenant
- [ ] Confirmar plano Railway para deploy

---

## Preferências do Usuário

- Respostas concisas, sem trailing summary redundante
- Spec-Driven Development rigoroso: spec antes de implementação
- Reaproveitamento máximo de padrões do sakura-bot-oficial

---

## Lições Aprendidas

- Open Finance Fase 1 é gratuita e sem cadastro — suficiente para simulações básicas
- NestJS x uWS: o projeto base já decidiu por uWS, não reabrir essa decisão sem motivo forte
- Dados financeiros requerem criptografia em repouso (LGPD) — considerar desde o schema

---

## Ideias Deferidas (v2+)

- Open Finance Fase 2/3 com consentimento do cliente
- App React Native para corretores em campo
- Integração com CRM (Pipedrive, HubSpot) para sincronizar leads
- Score interno de viabilidade usando ML
- Notificação automática quando taxa de banco cai
