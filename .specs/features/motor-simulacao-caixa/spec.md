# Spec: Motor de Simulação Caixa (F-005a / F-006)

**Status:** In Progress — T1/T2/T3 done (motor SAC + testes + integração). T4 (n8n WhatsApp) e T5 (job hash) pendentes.
**Escopo:** Simulação habitacional Caixa via cálculo local (SAC) com parâmetros extraídos do simulador oficial
**Milestone:** 2 — Motor de Simulação
**Requirement IDs:** CAIXA-01 a CAIXA-22

---

## Contexto Técnico: Por que cálculo local?

Análise completa do simulador oficial Caixa realizada em 2026-06-26 revelou:

| Portal | Resultado |
|--------|-----------|
| `habitacao.caixa.gov.br/siopiweb-web/` | Bloqueado por ShieldSquare (bot protection) |
| `portaldeempreendimentos.caixa.gov.br/simulador/` | Apache Tapestry com form state assinado (HMAC) — inautomatizável sem browser real |
| `app.novosimulador.caixa.gov.br/api/v1/` | Requer autenticação Keycloak SSO interna (`login.prd.caixa`) |
| `servicebus.caixa.gov.br/caixasim/` | Host não resolvível externamente (rede interna Caixa) |

**Decisão (ADR-006):** Todos os parâmetros de cálculo estão embutidos no bundle Angular
(`simuladorhabitacao.caixa.gov.br/main.4404e704734ce83c.js`, versão 1.15.12.0, 08/06/2026).
A simulação é feita **client-side** pela Caixa — replicável localmente com os mesmos dados.

---

## Problem Statement

Corretores precisam entregar ao cliente uma simulação de financiamento Caixa diretamente
no WhatsApp, sem redirecioná-los ao site. O processo manual (abrir o simulador, preencher
dados, copiar resultados para o chat) é lento e sujeito a erro. A Caixa não expõe API
pública — mas publica todos os parâmetros de cálculo no frontend.

## Goals

- [x] Implementar motor SAC com parâmetros oficiais Caixa (faixas MCMV, MIP, DFI, TAC)
- [x] Integrar ao fluxo WhatsApp de financiamento imobiliário
- [x] Entregar resultado formatado no chat com parcela inicial, final e total de juros
- [x] Persistir simulação no banco para histórico e comparativo futuro

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Sistema PRICE para Caixa | Caixa usa exclusivamente SAC para financiamento habitacional |
| Simulação via web scraping | Inviável — bot protection + Tapestry HMAC (ver ADR-006) |
| Subsidio Minha Casa Minha Vida | Cálculo de subsídio depende de dados de cadastro social não disponíveis |
| Simulação Caixa PJ / Comercial | Escopo v1 = pessoa física + imóvel residencial |
| Open Finance para Caixa | Caixa não publicou endpoint de simulação no Open Finance Fase 1 |
| Comparativo Caixa vs outros bancos | Fase 2 — após ter motor de cada banco individualmente |

---

## Parâmetros Oficiais Caixa (dados do bundle v1.15.12.0)

### Faixas MCMV — Taxa anual efetiva por renda e valor do imóvel

| Faixa | Renda Bruta Familiar | Valor Máx. Imóvel | Taxa a.a. |
|-------|---------------------|-------------------|-----------|
| 1 | até R$ 2.160 | R$ 210.000 | 4,8548% |
| 2 | até R$ 2.850 | R$ 210.000 | 5,1162% |
| 3 | até R$ 3.200 | R$ 210.000 | 5,3782% |
| 4 | até R$ 3.500 | R$ 210.000 | 5,6408% |
| 5 | até R$ 4.000 | R$ 210.000 | 6,1678% |
| 6 | até R$ 5.000 | R$ 210.000 | 7,2290% |
| 7 | até R$ 9.600 | R$ 400.000 | 8,4722% |
| 8 | até R$ 13.000 | R$ 600.000 | 10,4700% |
| 9 | até R$ 77.500 | R$ 2.250.000 | 11,4900% |
| 10 | acima de R$ 77.500 | sem limite | 13,4000% |

> Regra de enquadramento: usa o limite da faixa que satisfaz AMBAS as condições (renda E valor do imóvel).
> Se renda enquadra na Faixa 3 mas valor do imóvel excede o limite, usa a faixa mínima que comporte o imóvel.

### Seguros e Encargos

| Componente | Valor | Aplicação |
|------------|-------|-----------|
| TAC (Taxa de Avaliação de Crédito) | R$ 25,00 (fixo, único) | No 1º mês |
| DFI (Danos Físicos ao Imóvel) | 0,0066% a.m. sobre valor do imóvel | Em cada parcela |
| MIP (Morte e Invalidez Permanente) | Variável por idade (ver tabela) | Em cada parcela |

### Tabela MIP por Idade (% ao mês sobre saldo devedor)

| Idade | Taxa MIP/mês | Faixa etária |
|-------|-------------|--------------|
| 18–25 | 0,0093% | jovens |
| 26–30 | 0,0096% | |
| 31–35 | 0,0116% | |
| 36–40 | 0,0154% | |
| 41–45 | 0,0252% | |
| 46–50 | 0,0386% | |
| 51–55 | 0,0676% | |
| 56–60 | 0,1533% | |
| 61–65 | 0,2731% | |
| 66–70 | 0,3259% | |
| 71–75 | 0,4894% | |
| 76–80 | 0,5312% | máximo permitido |

> Regra: usa a taxa da idade atual do proponente mais velho no momento da contratação.

### Limites do Produto

| Parâmetro | Valor |
|-----------|-------|
| Prazo máximo | 35 anos (420 meses) |
| Idade máxima (prazo + idade) | 80 anos e 6 meses (966 meses) |
| Prazo máximo efetivo por idade | `min(420, 966 - idadeEmMeses)` |

---

## Fórmula SAC — Caixa

**Sistema de Amortização Constante (SAC):**

```
Amortização mensal = SaldoDevedor / NumeroParcelas
Juros do mês m = SaldoDevedor(m) × taxaMensal
Parcela(m) = Amortização + Juros(m) + MIP(m) + DFI(m)

SaldoDevedor(m) = valorFinanciado - (m × Amortização)
taxaMensal = (1 + taxaAnual)^(1/12) - 1

MIP(m) = SaldoDevedor(m) × taxaMIP
DFI(m) = valorImovel × 0.000066  ← fixo, não muda com saldo
```

**Entradas obrigatórias:**
- `valorImovel` — valor total do imóvel
- `entradaPercentual` ou `entradaValor` — mínimo 20% para SFH fora MCMV
- `valorFinanciado` = `valorImovel - entrada`
- `prazoMeses` — informado pelo usuário, limitado ao máximo por idade
- `rendaBrutaFamiliar` — para enquadramento de faixa
- `idadeProponente` — para taxa MIP e prazo máximo

**Saídas calculadas:**
- `parcela1` — primeira parcela (maior)
- `parcelaFinal` — última parcela (menor)
- `totalJuros` — soma de todos os juros
- `totalSegurosMIP` — total do seguro MIP
- `totalSegurosDFI` — total do seguro DFI
- `totalPago` — total desembolsado (financiado + juros + seguros + TAC)
- `cet` — Custo Efetivo Total anual
- `faixaMCMV` — faixa enquadrada (1–10, null se não MCMV)
- `taxaAnual` — taxa efetiva utilizada

---

## User Stories

### P1: Cálculo SAC com parâmetros Caixa ⭐ MVP

**User Story:** Como motor de simulação, preciso calcular corretamente uma simulação
SAC com os parâmetros oficiais da Caixa para que o resultado entregue ao cliente
seja equivalente ao do simulador oficial.

**Acceptance Criteria:**

1. WHEN recebo `valorImovel`, `valorFinanciado`, `prazoMeses`, `rendaBrutaFamiliar`,
   `idadeProponente` THEN SHALL retornar `parcela1`, `parcelaFinal`, `totalPago`,
   `totalJuros`, `faixaMCMV`, `taxaAnual`
2. WHEN `idadeProponente + prazoMeses > 966` THEN SHALL ajustar `prazoMeses` para
   `966 - idadeEmMeses` e retornar `prazoMeses` efetivo no resultado
3. WHEN `rendaBrutaFamiliar` ≤ 9.600 AND `valorImovel` ≤ 400.000 THEN SHALL usar
   taxa da faixa MCMV correspondente
4. WHEN `valorImovel` excede limite da faixa de renda THEN SHALL usar a menor faixa
   que comporta ambas as condições (renda E imóvel)
5. WHEN `valorFinanciado` < 0 OR `prazoMeses` < 12 THEN SHALL lançar erro de validação
6. WHEN calculado THEN incluir MIP usando tabela por idade e DFI = `valorImovel × 0,0066%`

**Independent Test:** Comparar parcela inicial calculada com saída do simulador oficial
Caixa para os mesmos parâmetros — margem de erro ≤ R$ 1,00.

---

### P1: Fluxo WhatsApp de coleta de dados para simulação Caixa ⭐ MVP

**User Story:** Como cliente no WhatsApp, quero informar os dados do meu financiamento
de forma conversacional para receber a simulação sem precisar acessar o site da Caixa.

**Acceptance Criteria:**

1. WHEN cliente seleciona modalidade `imobiliario` THEN bot SHALL iniciar coleta com:
   valor do imóvel → valor de entrada → prazo desejado → renda familiar → data de nascimento
2. WHEN bot recebe valor do imóvel THEN SHALL validar que é número positivo > R$ 50.000
3. WHEN bot recebe entrada THEN SHALL validar mínimo de 20% do valor do imóvel (regra SFH)
   e informar o mínimo se abaixo
4. WHEN cliente informa prazo THEN SHALL validar contra prazo máximo por idade e ajustar
   com mensagem explicativa se necessário
5. WHEN todos os dados coletados THEN SHALL calcular e exibir resultado formatado no chat
6. WHEN cliente confirma interesse THEN SHALL criar lead com status `simulacao_entregue`

**Independent Test:** Executar fluxo completo via WhatsApp e verificar que a simulação
é entregue antes de qualquer intervenção humana.

---

### P1: Mensagem de resultado formatada no WhatsApp ⭐ MVP

**User Story:** Como cliente, quero receber o resultado da simulação em formato legível
no WhatsApp para entender claramente quanto pagarei.

**Acceptance Criteria:**

1. WHEN resultado calculado THEN SHALL enviar mensagem com:
   - Valor do imóvel e valor financiado
   - Faixa MCMV enquadrada (quando aplicável) com taxa usada
   - Parcela inicial e final (SAC decresce)
   - Total de juros e total pago
   - Alerta visual se parcela > 30% da renda (regra de comprometimento)
2. WHEN faixa MCMV for 1-6 THEN SHALL destacar "✅ Você se enquadra no Minha Casa Minha Vida"
3. WHEN parcela inicial > 30% da renda THEN SHALL exibir aviso "⚠️ Parcela inicial compromete
   mais de 30% da renda — Caixa pode pedir renda complementar"
4. WHEN entregue THEN SHALL perguntar se deseja simulação com prazo diferente ou comparar
   com outros bancos

**Independent Test:** Enviar mensagem de simulação para número de teste e verificar
que todos os campos estão presentes e valores corretos.

---

### P2: Persistência da simulação no banco

**User Story:** Como corretor, quero acessar o histórico de simulações do cliente
para retomar a negociação com dados precisos.

**Acceptance Criteria:**

1. WHEN simulação calculada THEN SHALL persistir em `financing_simulations` com todos
   os parâmetros de entrada e resultados
2. WHEN cliente retoma conversa THEN bot SHALL oferecer opção de refazer ou revisar
   última simulação
3. WHEN corretor acessa painel THEN SHALL ver lista de simulações do cliente com data,
   banco, valor e status

**Independent Test:** Criar simulação via WhatsApp e verificar registro no banco via
endpoint `GET /api/v1/simulations/:clientId`.

---

### P2: Atualização periódica das faixas/taxas

**User Story:** Como sistema, preciso detectar quando a Caixa atualiza as taxas para
garantir que as simulações usem parâmetros corretos.

**Acceptance Criteria:**

1. WHEN versão do bundle Angular da Caixa muda (`simuladorhabitacao.caixa.gov.br/main.*.js`)
   THEN sistema SHALL registrar log de alerta para revisão manual
2. WHEN parâmetros divergem do último check THEN SHALL notificar administrador via WhatsApp
3. SHALL ter job diário que verifica hash do bundle para detectar mudanças

> **Nota:** A atualização das tabelas requer intervenção manual — a Caixa não expõe
> API de taxas. O job apenas alerta, não atualiza automaticamente.

---

### P3: Simulação com múltiplos prazos

**User Story:** Como cliente, quero comparar diferentes prazos (ex: 20, 30 e 35 anos)
para o mesmo imóvel para escolher a melhor opção.

**Acceptance Criteria:**

1. WHEN cliente solicita comparativo de prazos THEN bot SHALL calcular para 3 prazos
   (mínimo, médio e máximo viável por idade) e exibir tabela comparativa
2. WHEN exibido THEN SHALL destacar qual prazo tem melhor custo-benefício

---

## Edge Cases

- WHEN `idadeProponente` ≥ 80 THEN SHALL rejeitar com mensagem "Caixa não financia
  acima de 80 anos e 6 meses de prazo total"
- WHEN `valorFinanciado` < R$ 30.000 THEN SHALL informar que Caixa tem valor mínimo
  de financiamento
- WHEN `rendaBrutaFamiliar` = 0 THEN SHALL rejeitar com validação
- WHEN múltiplos proponentes THEN SHALL usar idade do mais velho para cálculo MIP e
  prazo máximo; usar soma das rendas para enquadramento de faixa
- WHEN faixa enquadrada pela renda tem limite de imóvel inferior ao valor informado
  THEN usar faixa superior automaticamente com nota explicativa
- WHEN `prazoMeses` resulta em menos de 12 meses após ajuste de idade THEN SHALL
  rejeitar com "Prazo insuficiente para financiamento"

---

## Requirement Traceability

| ID | Requisito | Story | Status |
|----|-----------|-------|--------|
| CAIXA-01 | Cálculo SAC: amortização constante + juros decrescentes | P1: Cálculo SAC | Done |
| CAIXA-02 | Enquadramento de faixa MCMV por renda E valor do imóvel | P1: Cálculo SAC | Done |
| CAIXA-03 | Cálculo MIP usando tabela por idade | P1: Cálculo SAC | Done |
| CAIXA-04 | Cálculo DFI = valorImovel × 0,0066% (fixo por mês) | P1: Cálculo SAC | Done |
| CAIXA-05 | TAC = R$25 no 1º mês | P1: Cálculo SAC | Done |
| CAIXA-06 | Prazo máximo = min(420, 966 - idadeEmMeses) | P1: Cálculo SAC | Done |
| CAIXA-07 | Conversão taxa anual → mensal: (1+a)^(1/12) - 1 | P1: Cálculo SAC | Done |
| CAIXA-08 | Validação entrada mínima 20% | P1: Fluxo WhatsApp | Pending — n8n |
| CAIXA-09 | Validação prazo mínimo 12 meses | P1: Fluxo WhatsApp | Done (erro lançado pela API) |
| CAIXA-10 | Ajuste automático de prazo por idade com notificação | P1: Fluxo WhatsApp | Done (API ajusta, aviso via log) |
| CAIXA-11 | Coleta sequencial: imóvel → entrada → prazo → renda → idade | P1: Fluxo WhatsApp | Pending — n8n |
| CAIXA-12 | Criação de lead com status `simulacao_entregue` | P1: Fluxo WhatsApp | Pending — n8n |
| CAIXA-13 | Mensagem resultado: parcela inicial e final | P1: Mensagem | Pending — n8n |
| CAIXA-14 | Mensagem resultado: total juros e total pago | P1: Mensagem | Pending — n8n |
| CAIXA-15 | Badge MCMV quando faixa 1-6 | P1: Mensagem | Pending — n8n |
| CAIXA-16 | Aviso comprometimento > 30% da renda | P1: Mensagem | Pending — n8n (incomeCommitmentPercent na resposta da API) |
| CAIXA-17 | CTA pós-simulação (outro prazo / comparar bancos) | P1: Mensagem | Pending — n8n |
| CAIXA-18 | Persistência em `financing_simulations` | P2: Persistência | Done (parâmetros persistidos) |
| CAIXA-19 | Persistência em `simulation_results` (resultados por banco) | P2: Persistência | Done (SAC result persistido) |
| CAIXA-20 | Oferta de revisão ao retomar conversa | P2: Persistência | Pending — n8n |
| CAIXA-21 | Job diário de check de hash do bundle Caixa | P2: Atualização | Pending |
| CAIXA-22 | Notificação admin quando bundle muda | P2: Atualização | Pending |

**Coverage:** 22 total, 11 done, 11 pendentes (n8n + P2)

---

## Success Criteria

- [ ] Parcela calculada com margem ≤ R$ 1,00 vs. simulador oficial Caixa (para mesmos parâmetros)
- [ ] Cliente recebe simulação completa em < 60 segundos após informar o último dado
- [ ] Fluxo de coleta concluído sem intervenção humana em ≥ 70% das sessões
- [ ] Simulação persistida corretamente para 100% das conversas concluídas
- [ ] Testes unitários do motor cobrindo: 5 faixas diferentes, idade-limite, entrada-mínima, multiple proponentes
