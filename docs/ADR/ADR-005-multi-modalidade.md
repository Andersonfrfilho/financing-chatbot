# ADR-005: Arquitetura Multi-Modalidade de Financiamento

**Status:** Aceito  
**Data:** 2026-06-19  
**Autores:** Time de desenvolvimento

---

## Contexto

O sistema foi inicialmente especificado como "bot de financiamento imobiliário". Durante o refinamento com o usuário, ficou claro que corretores e correspondentes bancários trabalham com múltiplos produtos: imóveis, veículos, crédito pessoal, consignado, PJ, equipamentos e crédito rural.

## Decisão

O bot suporta **7 modalidades** de financiamento. O usuário escolhe a modalidade no primeiro passo do fluxo (`awaiting_financing_type`) e o fluxo conversacional ramifica por tipo.

## Modalidades

| Código | Descrição | Produtos bancários | Sistemas de amortização |
|--------|-----------|-------------------|------------------------|
| `imobiliario` | Financiamento de imóveis | SFH, SFI, FGTS, MCMV | SAC + PRICE |
| `veiculo` | Financiamento de veículos | CDC, Leasing | SAC + PRICE |
| `pessoal` | Empréstimo pessoal | Pessoal | PRICE |
| `consignado` | Crédito consignado | Consignado Público/Privado/INSS | PRICE |
| `empresa` | Crédito PJ | Capital de Giro, Desconto de Duplicatas | SAC + PRICE |
| `equipamento` | Financiamento de equipamentos | FINAME | SAC + PRICE |
| `rural` | Crédito rural | Rural | SAC + PRICE |

## Impacto no Schema

### `financing_simulations`

- Campo obrigatório `financing_type` (enum com as 7 modalidades)
- Campos opcionais por modalidade:
  - Imobiliário: `property_value`, `property_type`, `property_city`, `property_state`, `fgts_amount`
  - Veículo: `vehicle_type`, `vehicle_year`
  - Empréstimos: dados em `metadata` (JSONB)
- `metadata` JSONB para extensibilidade futura sem alterar schema

### `bank_rates`

- Campo `modality` usa enum granular `financing_modality` (15 valores: SFH, SFI, FGTS, MCMV, CDC, PESSOAL, CONSIGNADO_PUBLICO, etc.)
- Permite taxas diferentes por produto dentro da mesma modalidade principal

## Impacto no Bot

O fluxo conversacional tem **handlers separados por fase**, não por modalidade:

```
GlobalHandler → GreetingHandler → FinancingTypeHandler
    → PersonalDataHandler → FinancialDataHandler
    → [ImmovableHandler | VehicleHandler | LoanHandler]  ← ramificação por tipo
    → TermAndSimulationHandler → SimulationResultHandler
```

Cada handler checa o `financing_type` no contexto para saber o que coletar.

## Mapeamento tipo → modalidades bancárias

```typescript
const MODALITY_BY_TYPE = {
  imobiliario: ['SFH', 'SFI', 'FGTS', 'MCMV'],
  veiculo: ['CDC'],
  pessoal: ['PESSOAL'],
  consignado: ['CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS'],
  empresa: ['CAPITAL_GIRO'],
  equipamento: ['FINAME'],
  rural: ['RURAL'],
}
```

## Consequências

- Schema mais complexo mas extensível — nova modalidade = novo valor no enum + handler opcional
- Resultados de simulação sempre comparando os bancos disponíveis para a modalidade escolhida
- Dashboard pode filtrar simulações por `financing_type` para análise comercial

## Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Apenas imobiliário | Não atende o escopo real do negócio dos corretores |
| Tabelas separadas por modalidade | Duplicação de lógica; impossibilita relatórios consolidados |
| Schema totalmente genérico (só metadata) | Perde type safety e validações no nível do banco |
