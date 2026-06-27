# Roadmap

## Milestone 1 — Fundação (Semana 1-2)

**Goal:** Projeto scaffoldado e infra rodando localmente.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-001 | Scaffold do projeto (monorepo, Docker Compose, Makefile) | Crítica | Pendente |
| F-002 | Schema do banco de dados (clientes, simulações, bancos, leads) | Crítica | Pendente |
| F-003 | Módulo de autenticação (JWT, RBAC básico) | Crítica | Pendente |
| F-004 | Infraestrutura base da API (uWS, Router, middlewares, container) | Crítica | Pendente |

---

## Milestone 2 — Motor de Simulação (Semana 2-3)

**Goal:** Cálculo SAC/PRICE funcional com taxas reais dos bancos.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-005 | Módulo Open Finance — busca e cache de taxas (Fase 1) | Crítica | Pendente |
| F-005a | Motor de Simulação Caixa — SAC local com parâmetros do bundle Angular | Crítica | **Spec pronta** → `.specs/features/motor-simulacao-caixa/` |
| F-006 | Motor SAC genérico: parcela inicial, final, total juros, CET | Crítica | Pendente |
| F-007 | Motor PRICE: parcela fixa, total juros, CET | Crítica | Pendente |
| F-008 | Comparativo multi-banco via API REST | Alta | Pendente |
| F-009 | Testes unitários do motor de simulação | Crítica | Pendente |

---

## Milestone 3 — Bot WhatsApp (Semana 3-4)

**Goal:** Fluxo conversacional completo de captação de leads.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-010 | Handler: saudação e identificação do cliente | Crítica | Pendente |
| F-011 | Handler: coleta de dados pessoais (nome, CPF, nascimento, etc.) | Crítica | Pendente |
| F-012 | Handler: coleta de dados financeiros (renda, FGTS, entrada) | Crítica | Pendente |
| F-013 | Handler: coleta de dados do imóvel | Crítica | Pendente |
| F-014 | Handler: seleção de parcelas e entrega da simulação | Crítica | Pendente |
| F-015 | Handler: retomada de conversa interrompida | Alta | Pendente |
| F-016 | Handler: handoff para atendente humano | Alta | Pendente |
| F-017 | Workflow n8n para financiamento | Crítica | Pendente |

---

## Milestone 4 — CRUD e Gestão (Semana 4-5)

**Goal:** APIs completas para todas as entidades.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-018 | Módulo Clientes (CRUD + histórico de simulações) | Alta | Pendente |
| F-019 | Módulo Simulações (histórico, comparativos, resultados) | Alta | Pendente |
| F-020 | Módulo Bancos (taxas, produtos, configurações) | Alta | Pendente |
| F-021 | Módulo Leads (status, funil, conversões) | Alta | Pendente |
| F-022 | Módulo Usuários e Perfis (RBAC) | Alta | Pendente |

---

## Milestone 5 — Dashboards e Frontend (Semana 5-7)

**Goal:** Interface web operacional para a equipe.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-023 | Dashboard Geral (leads, simulações, conversões, receita) | Alta | Pendente |
| F-024 | Dashboard Comercial (funil, conversão, tempo médio) | Alta | Pendente |
| F-025 | Dashboard Financeiro (bancos mais escolhidos, ticket médio) | Média | Pendente |
| F-026 | Dashboard Operacional (conversas iniciadas/concluídas/abandonadas) | Média | Pendente |
| F-027 | Painel Atendimento (lista de clientes, histórico, simulações) | Alta | Pendente |
| F-028 | Painel Comercial (leads, follow-up, propostas) | Alta | Pendente |
| F-029 | Painel Administração (usuários, perfis, permissões) | Alta | Pendente |

---

## Milestone 6 — Documentação e Deploy (Semana 7-8)

**Goal:** Sistema pronto para produção com documentação completa.

### Features

| ID | Feature | Prioridade | Status |
|----|---------|-----------|--------|
| F-030 | PRD.md | Alta | Pendente |
| F-031 | BUSINESS_RULES.md | Alta | Pendente |
| F-032 | ADR/ (Architecture Decision Records) | Média | Pendente |
| F-033 | DATABASE.md | Alta | Pendente |
| F-034 | API.md | Alta | Pendente |
| F-035 | OPEN_FINANCE.md | Alta | Pendente |
| F-036 | WHATSAPP_FLOW.md | Alta | Pendente |
| F-037 | TEST_PLAN.md | Alta | Pendente |
| F-038 | DEPLOYMENT.md | Alta | Pendente |
| F-039 | PROGRESS.md | Alta | Pendente |
| F-040 | Configuração Railway (railway.toml) | Alta | Pendente |

---

## v2 (Futuro)

- Open Finance Fase 2/3 (simulação personalizada com dados do cliente)
- App mobile React Native
- Integração com Tecnospeed/Belvo como hub intermediador
- Análise de crédito com bureau externo
- Assinatura digital de propostas (DocuSign/D4Sign)
- Multi-tenant (múltiplas corretoras na mesma instância)
