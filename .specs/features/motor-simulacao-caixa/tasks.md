# Tasks: Motor de Simulação Caixa (F-005a)

**Feature:** Motor de Simulação Caixa — SAC local com parâmetros do bundle Angular
**Spec:** `.specs/features/motor-simulacao-caixa/spec.md`
**Requirements cobertos nesta sessão:** CAIXA-01 a CAIXA-07, CAIXA-18, CAIXA-19

---

## T1 — CaixaMcmvCalculatorService (serviço puro de cálculo)

**Status:** Done
**Arquivo:** `apps/api/src/modules/simulations/application/services/CaixaMcmvCalculatorService.ts`
**Requisitos:** CAIXA-01, CAIXA-02, CAIXA-03, CAIXA-04, CAIXA-05, CAIXA-06, CAIXA-07

### Descrição

Serviço puro (sem I/O, sem DB) que calcula uma simulação SAC com os parâmetros oficiais da Caixa:
- Tabela de 10 faixas MCMV (renda + valor do imóvel → taxa a.a.)
- Tabela MIP por faixa etária (% ao mês sobre saldo devedor)
- DFI = 0,0066% ao mês sobre valor do imóvel (fixo)
- TAC = R$ 25,00 (apenas na 1ª parcela)
- Prazo máximo efetivo = `min(420, 966 - idadeEmMeses)`

### Entradas

```typescript
interface CaixaMcmvInput {
  propertyValue: number         // valor do imóvel (para DFI e enquadramento)
  financedAmount: number        // valor financiado
  termMonths: number            // prazo solicitado
  familyMonthlyIncome: number   // renda bruta familiar (para faixa)
  applicantAgeYears: number     // idade do proponente mais velho
}
```

### Saídas

```typescript
interface CaixaMcmvResult {
  system: 'SAC'
  mcmvFaixa: number                         // 1–10
  annualRate: number                        // taxa efetiva usada
  effectiveTermMonths: number               // prazo após ajuste por idade
  firstInstallment: number                  // inclui amortização + juros + MIP + DFI + TAC
  lastInstallment: number                   // inclui amortização + juros + MIP + DFI
  firstInstallmentBreakdown: { amortization, interest, mip, dfi, tac }
  totalInterest: number
  totalMip: number
  totalDfi: number
  tac: number                               // sempre 25.00
  totalCost: number                         // financiado + juros + MIP + DFI + TAC
  incomeCommitmentPercent: number           // firstInstallment / familyMonthlyIncome × 100
}
```

### Critério de aceite

- Erro lançado se prazo efetivo < 12 meses
- Erro lançado se `applicantAgeYears` < 18 ou ≥ 80.5
- Erro lançado se `financedAmount` ≤ 0 ou `familyMonthlyIncome` ≤ 0
- `incomeCommitmentPercent` calculado corretamente
- Primeira parcela sempre maior que a última

---

## T2 — Testes unitários do CaixaMcmvCalculatorService

**Status:** Done
**Arquivo:** `apps/api/src/tests/CaixaMcmvCalculatorService.test.ts`
**Requisitos:** CAIXA-01 a CAIXA-07 (verificação via testes)

### Cenários obrigatórios

1. Faixa 1 (renda R$ 2.000, imóvel R$ 180.000) — taxa 4,8548%
2. Faixa 7 (renda R$ 8.000, imóvel R$ 350.000) — taxa 8,4722%
3. Faixa 10 (renda R$ 100.000, imóvel R$ 3.000.000) — taxa 13,40%
4. Ajuste de prazo por idade (45 anos + 35 anos = 80 anos → prazo deve ser limitado)
5. Faixa forçada por valor do imóvel (renda baixa mas imóvel alto)
6. Validação de erro para idade ≥ 80.5
7. SAC decrescente: primeira parcela > última
8. `totalCost` = `financedAmount` + `totalInterest` + `totalMip` + `totalDfi` + TAC

---

## T3 — Integrar CaixaMcmvCalculatorService ao CreateSimulationUseCase

**Status:** Done
**Arquivo:** `apps/api/src/modules/simulations/application/use-cases/CreateSimulationUseCase.ts`
**Requisitos:** CAIXA-08 (entrada mínima — validação no WhatsApp), CAIXA-10, CAIXA-18, CAIXA-19

### Mudanças

1. Adicionar `applicantAgeYears?: number` ao `SimulationInput`
2. Tornar `price` opcional em `BankSimulationResult` (Caixa usa SAC exclusivamente)
3. Adicionar campo `caixaMcmv?` ao `BankSimulationResult` para dados específicos Caixa
4. No `execute()`: quando `financingType === 'imobiliario'` e `applicantAgeYears` + `propertyValue` + `monthlyIncome` presentes:
   a. Remover Caixa de `bestRateByBank` (evitar duplicata)
   b. Calcular via `CaixaMcmvCalculatorService`
   c. Buscar `bankId` da Caixa no banco por `code = 'CAIXA'`
   d. Adicionar resultado a `results` e `resultValues`
5. Erros do CaixaMcmvCalculatorService devem ser capturados (log warn) sem falhar a simulação inteira

### Critério de aceite

- Quando `applicantAgeYears` não informado: Caixa aparece com taxa Open Finance (comportamento anterior)
- Quando condições atendidas: Caixa aparece com taxa MCMV e campo `caixaMcmv` populado
- Persistência: 1 linha em `simulation_results` para Caixa MCMV (SAC, sem PRICE)

---

## T4 — Formatação da mensagem WhatsApp (n8n)

**Status:** Deferred (próxima sessão)
**Requisitos:** CAIXA-11 a CAIXA-17
**Nota:** Implementado no n8n, fora do escopo desta sessão de API.

---

## T5 — Job de monitoramento do bundle Caixa

**Status:** Deferred
**Requisitos:** CAIXA-21, CAIXA-22
**Nota:** Job cron para verificar hash do bundle Angular — P2.

---

## Dependências

```
T1 (sem dependências)
  └── T2 (depende de T1)
  └── T3 (depende de T1)
```
