# Product Requirements Document — Financiamento Bot

**Versão:** 1.0  
**Data:** 2026-06-19  
**Status:** Em implementação

---

## 1. Visão Geral

O **Financiamento Bot** é um sistema de captação e simulação de financiamentos via WhatsApp, composto por:

- **Bot conversacional** (n8n + Meta Cloud API): captura dados do cliente via fluxo guiado
- **Motor de simulação** (Bun + uWebSockets.js): calcula SAC e PRICE comparando múltiplos bancos via Open Finance
- **Painel administrativo** (React + Vite): gestão de leads, clientes, bancos, usuários e relatórios

---

## 2. Público-alvo

| Perfil | Necessidade |
|--------|-------------|
| **Clientes finais** | Simular financiamentos pelo WhatsApp sem burocracia |
| **Consultores comerciais** | Acompanhar leads e propostas em tempo real |
| **Administradores** | Configurar bancos, taxas e usuários do sistema |

---

## 3. Modalidades de Financiamento

| # | Modalidade | Sistemas | Modalidades bancárias |
|---|-----------|----------|----------------------|
| 1 | Imobiliário | SAC + PRICE | SFH, SFI, FGTS, MCMV |
| 2 | Veículo | SAC + PRICE | CDC, Leasing |
| 3 | Crédito Pessoal | PRICE | Pessoal |
| 4 | Consignado | PRICE | Consignado Público, Privado, INSS |
| 5 | Empresa/PJ | SAC + PRICE | Capital de Giro, Desconto de Duplicatas |
| 6 | Equipamento | SAC + PRICE | FINAME |
| 7 | Rural/Agrícola | SAC + PRICE | Rural |

---

## 4. Funcionalidades Principais

### F-001: Fluxo Conversacional WhatsApp
- Captura: nome, CPF (validado), data de nascimento, estado civil, e-mail, cidade, estado
- Captura financeira: renda mensal, renda familiar
- Ramificação por modalidade (7 fluxos distintos)
- Cálculo de prazo (atalhos 1-5 ou número livre 6-420 meses)
- Retomada de sessão interrompida

### F-002: Motor de Simulação
- Consulta taxas via Open Finance Brasil Fase 1 (APIs públicas)
- Fallback para taxas de mercado hardcoded
- Cache de taxas em Redis por 24h
- Cálculo SAC: parcela decrescente, amortização constante
- Cálculo PRICE: parcela fixa, sistema francês (PMT)
- Persiste resultados no PostgreSQL
- Broadcast WebSocket ao painel ao concluir

### F-003: Painel Administrativo
- Dashboard com métricas em tempo real (leads, clientes, simulações, sessões)
- Gestão de leads com funil de vendas e atualização de status
- Listagem de clientes com busca
- Histórico de simulações com resultados por banco
- Monitor de sessões ativas com opção de reset
- Cadastro de bancos e taxas manuais
- Gestão de usuários e perfis de acesso

### F-004: Autenticação e Autorização
- Login com e-mail + senha (argon2 + JWT HS256)
- Refresh token com rotação (armazenado em Redis)
- RBAC: admin, comercial, atendimento
- Permissões granulares por recurso e ação

---

## 5. Restrições Técnicas

- **Latência do bot**: ≤ 3s por mensagem (exceto simulação)
- **LGPD**: CPF e dados financeiros criptografados em repouso (AES-256)
- **Open Finance**: apenas Fase 1 (dados abertos, sem autenticação)
- **Disponibilidade**: 99,5% para o fluxo WhatsApp
- **Backups**: banco de dados com backup diário automatizado

---

## 6. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Taxa de conclusão do fluxo | > 40% dos inícios |
| Tempo médio de simulação | < 10s |
| Taxa de conversão lead → proposta | > 20% |
| NPS dos consultores | > 7 |
