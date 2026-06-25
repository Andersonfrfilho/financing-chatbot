---
marp: true
theme: uncover
class:
  - lead
paginate: true
style: |
  section {
    background: linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%);
    color: #e2e8f0;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  section.lead {
    text-align: center;
  }
  section.lead h1 {
    font-size: 2.5em;
    color: #60a5fa;
  }
  section h2 {
    color: #60a5fa;
    border-bottom: 2px solid #60a5fa20;
    padding-bottom: 0.3em;
  }
  section h3 {
    color: #93c5fd;
  }
  table {
    margin: 0 auto;
    font-size: 0.7em;
  }
  th {
    background: #1e3a5f;
    color: #60a5fa;
  }
  td, th {
    border-color: #2a4a6f;
  }
  code {
    background: #1e3a5f;
    color: #7dd3fc;
  }
  strong {
    color: #fbbf24;
  }
  a {
    color: #60a5fa;
  }
  blockquote {
    border-left: 4px solid #60a5fa;
    color: #94a3b8;
    font-style: italic;
  }
  section.slide-green h2 { color: #4ade80; }
  section.slide-green table th { background: #14532d; color: #4ade80; }
---

# Financiamento Bot

Plataforma de captação e simulação de financiamentos via **WhatsApp**

![h:80](https://img.shields.io/badge/React-20232A?style=flat&logo=react) ![h:80](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun) ![h:80](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql) ![h:80](https://img.shields.io/badge/WhatsApp-25D366?style=flat&logo=whatsapp&logoColor=white)

<br>
<small>contato@financiamento.bot</small>

---

## Capa

**Financiamento Bot**
Captação, simulação e conversão de financiamentos pelo WhatsApp

Painel administrativo | Bot inteligente | Motor de simulação | 7 modalidades

---

## O Problema

### Como funciona hoje?

| Etapa | Canal tradicional |
|---|---|
| Interesse | Cliente liga ou vai à agência |
| Coleta de dados | Preenche formulário em papel ou PDF |
| Simulação | Consultor acessa sistema interno do banco |
| Comparação | Compara manualmente 1 ou 2 bancos |
| Follow-up | Ligações, e-mails, WhatsApp manual |

### Dores do processo atual

- **Tempo médio:** 3–5 dias úteis entre o primeiro contato e a simulação pronta
- **Abandono:** 70% dos leads se perdem antes da primeira simulação
- **Custo operacional:** consultor dedicado para cada lead
- **Erro humano:** simulações incorretas por digitação ou taxas desatualizadas

---

## A Solução

**Financiamento Bot** automatiza toda a jornada:

```
Cliente envia "oi" no WhatsApp
        ↓
Bot captura dados em ~3 minutos (fluxo guiado)
        ↓
Motor calcula SAC + PRICE comparando todos os bancos
        ↓
Cliente recebe simulação instantânea no WhatsApp
        ↓
Consultor assume (takeover) se cliente pedir ajuda humana
```

**Resultado:** lead → simulação em **< 5 minutos**, 24h por dia, sem consultor.

---

## Arquitetura Técnica

```
┌─────────────────────────────────────────────────────┐
│                   WhatsApp (Meta Cloud API)           │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────▼──────────────┐
    │     n8n Workflow (bot)      │  ← Fluxo conversacional
    │  Máquina de estados + FIPE  │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  API (Bun + uWebSockets.js) │  ← Motor de simulação
    │  PostgreSQL + Redis          │     Painel admin
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Painel Admin (React)       │  ← Gestão de leads,
    │  Vite + Tailwind + shadcn   │     clientes, bancos
    └────────────────────────────┘
```

- **Infra:** Railway (API + Web + PostgreSQL + Redis)
- **Integrações:** Meta Cloud API (WhatsApp), Open Finance Brasil (taxas)
- **Cache:** Redis — taxas bancárias (24h), webhooks (dedup 5min)

---

## Funcionalidades Principais

### 🤖 Bot WhatsApp Inteligente

- 7 modalidades de financiamento (imobiliário, veículo, pessoal, consignado, empresa, equipamento, rural)
- Captura guiada: nome, CPF (validado), renda, dados do bem, entrada, FGTS
- Atalhos de prazo (12 a 420 meses) ou valor livre
- Retomada de sessão interrompida
- Lookup FIPE para veículos (valor de mercado automático)

### 📊 Motor de Simulação

- **SAC** (amortização constante): parcela decrescente + CET
- **PRICE** (sistema francês): parcela fixa + CET
- Comparação multi-banco em paralelo (Caixa, Santander, BB, Itaú, Bradesco)
- Taxas via Open Finance Brasil + fallback manual

### 👥 Painel Administrativo

- Dashboard com métricas em tempo real
- Gestão de leads com funil (novo → qualificado → negociando → proposta → ganho)
- Atendimento humano via takeover de conversa
- SSR/SSE para atualizações ao vivo

---

## Fluxo de Atendimento Humano

```
Cliente no WhatsApp                Painel Admin
─────────────────                  ────────────
                                   
"Preciso falar com alguém"   →     🔔 Aparece na fila
                                   "Aguardando atendimento"
                                   
                            ←     Consultor clica "Assumir"
                                   Modo: bot → humano
                                   
Troca mensagens em tempo real ↔   Chat em tempo real
                                   
"Resolvido, obrigado!"      ←     Consultor clica "Finalizar"
                                   Modo: humano → bot
```

- **Janela de 24h WhatsApp:** indicador visual no painel
- **Notificações:** desktop + toast no painel
- **Template HSM:** reengajamento pós-24h

---

## Tela do Painel (Screenshots)

| Tela | Descrição |
|---|---|
| **Dashboard** | Métricas em tempo real: leads, clientes, simulações, sessões ativas |
| **Conversas** | Lista com status da janela 24h (🟢🟡🔴⚪), chat em tempo real com SSE |
| **Leads** | Funil de vendas, filtros por status/vendedor/data, status editável |
| **Clientes** | Cadastro com busca (nome/WhatsApp/e-mail), filtros por cidade/UF/data |
| **Simulações** | Histórico com bancos comparados, filtros por modalidade e data |
| **Sessões** | Monitor de sessões ativas do bot com nome do cliente e reset |
| **Bancos** | Cadastro de bancos, taxas manuais por modalidade |
| **Configurações** | Dados da empresa, feature toggles, recuperação de senha |

---

## Modelo de Negócio (SaaS B2B)

### Planos

| | **Essencial** | **Profissional** | **Enterprise** |
|---|---|---|---|
| **Preço/mês** | **R$ 497** | **R$ 997** | sob consulta |
| Agentes simultâneos | 1 | 5 | ilimitado |
| Sessões bot/mês | até 500 | até 2.000 | ilimitado |
| Templates WhatsApp | 1 | 3 | ilimitado |
| Suporte | e-mail (48h) | WhatsApp (24h) | dedicado (4h) |

### Setup fee (implantação única)

- Configuração inicial + integração WhatsApp: **R$ 800**
- Com número já registrado na Meta: **R$ 500**

---

## Projeção Financeira

| Clientes | Plano médio | Receita bruta | Custos | Líquido total |
|---|---|---|---|---|
| 1 | Essencial | R$ 497 | R$ 230 | R$ 267 |
| 5 | Profissional | R$ 4.985 | R$ 700 | R$ 4.285 |
| 10 | Misto | R$ 7.470 | R$ 1.100 | R$ 6.370 |
| 20 | Misto | R$ 14.940 | R$ 1.800 | R$ 13.140 |

- **Break-even:** 1 cliente Essencial cobre o custo fixo (~R$ 220/mês)
- **Custo marginal por cliente:** ~R$ 80–120/mês (infra compartilhada)
- **Custo WhatsApp API:** até 1.000 conversas/mês gratuitas (free tier Meta)

---

## Diferenciais Competitivos

| Concorrente | Limitação | Nosso diferencial |
|---|---|---|
| Planilhas manuais | Erro humano, lento | Automatizado, multi-banco |
| Sites de simulação | Sem follow-up | WhatsApp integrado + CRM |
| Chatbots genéricos | Só capturam lead | Simula SAC + PRICE real |
| CRMs tradicionais | Não simulam | Funil + cálculo financeiro |
| Outros bots WhatsApp | Só 1-2 modalidades | 7 modalidades + FIPE |

---

## Mercado Potencial

### Tamanho do mercado (Brasil)

| Segmento | Volume anual |
|---|---|
| Financiamento imobiliário | 600 mil unidades (2024) |
| Financiamento de veículos | 5,7 milhões de unidades |
| Crédito consignado | R$ 640 bilhões em carteira |
| Capital de giro PJ | R$ 350 bilhões |

### Público-alvo inicial

- Correspondentes bancários (2.500+ no Brasil)
- Imobiliárias digitais
- Lojas de veículos (concessionárias + seminovos)
- Plataformas de crédito (fintechs)

---

## Roadmap

| Fase | Entregas | Status |
|---|---|---|
| **MVP** (Jun/2026) | Bot + Simulação + Painel + 7 modalidades | ✅ Concluído |
| **Beta** (Jul/2026) | 1º cliente piloto, ajustes de UX/UX | 🔄 Em andamento |
| **V1** (Ago/2026) | Templates WhatsApp, relatórios, multi-tenant | 📋 Planejado |
| **V2** (Set/2026) | Open Finance Fase 2 (consentimento), proposta em PDF | 📋 Planejado |
| **V3** (Out/2026) | Integração CRMs (HubSpot, RD Station), white-label | 📋 Planejado |

---

## Oportunidade de Mercado

> **"O WhatsApp é o canal #1 de vendas no Brasil — mas 90% das empresas ainda atendem manualmente."**

- **87%** das PMEs brasileiras usam WhatsApp para vendas
- **60%** dos clientes preferem resolver tudo por mensagem, sem ligar
- **3x mais conversão** quando a simulação chega em < 5 minutos
- **Redução de 80%** no custo operacional vs atendimento humano 100%

O Financiamento Bot automatiza o que hoje é feito manualmente, com mais precisão, velocidade e escalabilidade.

---

## Contato

**Financiamento Bot**

- 🌐 Produção: https://financing-frontend-production.up.railway.app
- 📧 E-mail: contato@financiamento.bot
- 💬 Demonstração: envie "oi" para nosso WhatsApp

**Tecnologias:** React · Bun · PostgreSQL · Redis · n8n · Meta Cloud API · Open Finance Brasil
