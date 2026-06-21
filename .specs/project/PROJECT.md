# financiamento-bot

**Vision:** Sistema de captação, qualificação e simulação de múltiplas modalidades de financiamento via WhatsApp, com comparação multi-banco e painel administrativo para corretores, correspondentes bancários e gestores.

**For:** Correspondentes bancários, corretoras, fintechs e assessorias financeiras que precisam qualificar leads de crédito de forma automatizada e escalável.

**Solves:** Elimina o processo manual de coleta de dados financeiros e cálculo de simulações, que hoje depende de ligações telefônicas e planilhas — resultando em leads desqualificados, demora no atendimento e oportunidades perdidas.

## Modalidades Suportadas

O usuário escolhe a modalidade no início do fluxo:

| Código | Modalidade | Produtos Bancários |
|--------|-----------|-------------------|
| `imobiliario` | Financiamento Imobiliário | SFH, SFI, FGTS, MCMV |
| `veiculo` | Financiamento de Veículos | CDC, Leasing |
| `pessoal` | Empréstimo Pessoal | Crédito pessoal, FGTS Antecipado |
| `consignado` | Crédito Consignado | Público, Privado, INSS |
| `empresa` | Crédito para PJ | Capital de giro, Desconto de duplicatas |
| `equipamento` | Financiamento de Equipamentos | FINAME, Leasing |
| `rural` | Crédito Rural | Custeio, Investimento |

---

## Goals

- **G1 — Captação automatizada:** Bot WhatsApp captura 100% dos dados necessários para simulação sem intervenção humana, com taxa de conclusão de fluxo ≥ 70%.
- **G2 — Simulação multi-banco:** Gerar comparativo SAC/PRICE para ≥ 4 bancos (Caixa, Santander, BB, Itaú) em < 3 segundos usando taxas do Open Finance.
- **G3 — Qualificação de leads:** Classificar automaticamente leads por viabilidade (renda, LTV, FGTS) antes de encaminhar para corretor.
- **G4 — Painel operacional:** Equipe comercial acessa leads, simulações e funil em tempo real via dashboard web.

---

## Tech Stack

**Core:**
- Runtime: Bun
- Language: TypeScript ~5.7.3
- HTTP: uWebSockets.js (padrão do projeto base)
- Database: PostgreSQL 16 (pgvector/pg16)
- Cache: Redis 7 + ioredis
- ORM: Drizzle ORM

**Serviços:**
- WhatsApp: Meta Cloud API (oficial, sem risco de ban)
- Orquestração: n8n (self-hosted)
- Atendimento humano: Chatwoot (handoff)
- Auth: jose (JWT RS256)
- Validation: zod

**Frontend:**
- React + Vite + TypeScript
- TanStack Query + Zustand
- TailwindCSS

**Infraestrutura:**
- Docker + Docker Compose
- Deploy: Railway

---

## Scope

**v1 inclui:**
- Fluxo conversacional WhatsApp completo (coleta de dados pessoais, financeiros e do imóvel)
- Validação e retomada de conversas interrompidas
- Motor de simulação SAC + PRICE
- Comparação entre ≥ 4 bancos usando Open Finance Fase 1 (sem autenticação)
- Cache diário de taxas por banco
- CRUD completo de clientes, simulações, bancos e leads
- Painel web para equipe (atendimento, comercial, administração)
- Dashboards (geral, comercial, financeiro, operacional)
- Handoff para atendente humano via Chatwoot
- Docker Compose pronto para produção

**Explicitamente fora do escopo v1:**
- Integração com Open Finance Fase 2/3 (requer certificação BCB — meses)
- App mobile (React Native — v2)
- Assinatura digital de propostas
- Integração direta com sistemas bancários (SISBACEN, etc.)
- Análise de crédito com bureau (Serasa/SPC)
- Correspondente bancário com transmissão de proposta

---

## Constraints

- **Técnico:** Manter arquitetura idêntica ao sakura-bot-oficial (uWS + Drizzle + Bun)
- **Técnico:** Não requer certificação Open Finance para v1 — usar apenas Fase 1 (dados abertos)
- **Segurança:** Dados sensíveis (CPF, renda) criptografados em repouso; jamais em logs
- **Legal:** Uso de simuladores públicos dos bancos em conformidade com ToS pública
