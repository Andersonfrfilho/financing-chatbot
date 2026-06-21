# Testing Infrastructure

**Source:** sakura-bot-oficial

## Test Frameworks

**Unit/Integration:** `bun test` (nativo do Bun)
**E2E:** Não implementado no projeto base
**Coverage:** Não configurado formalmente

## Test Organization

**Location:** `tests/` na raiz (testes de fluxo n8n) + futuros `apps/api/src/**/*.test.ts`
**Naming:** `*.test.ts` ou `*.test.js`
**Estrutura observada:**
```
tests/
  flow.test.js    ← testa fluxo conversacional do bot
```

## Test Execution

**Commands:**
```bash
bun test                          # todos os testes
make validate                     # build + testes + validação JSON/JS
make test-msg MSG="oi" TEL=5511999  # simula mensagem WhatsApp
```

## Observações para o Novo Projeto

O projeto base tem cobertura de testes mínima. Para financiamento-imobiliario-bot, priorizar:

1. **Unit tests obrigatórios:**
   - Cálculo SAC (fórmula matemática — zero tolerância a erro)
   - Cálculo PRICE (idem)
   - Validação de CPF
   - Parsing e validação dos dados coletados pelo bot

2. **Integration tests prioritários:**
   - Fluxo completo de captação: inicio → coleta → simulação → lead salvo
   - CRUD de clientes e simulações
   - Cache de taxas Open Finance

3. **E2E (futuro):**
   - Simular webhook da Meta → resposta do bot → dados salvos

## Coverage Targets

**Atual no base:** Não medido
**Meta para novo projeto:**
- Use cases de simulação: 100%
- Handlers de WhatsApp: 80%+
- Módulos de domínio: 90%+
