# Regras de Negócio — Financiamento Bot

## RN-001: Validação de CPF

O CPF deve ser validado usando o algoritmo oficial da Receita Federal (dígitos verificadores). CPFs com todos os dígitos iguais (ex: 111.111.111-11) são inválidos mesmo que passem na fórmula.

## RN-002: Elegibilidade por Renda

| Modalidade | Renda mínima mensal |
|-----------|---------------------|
| Imobiliário SFH | R$ 1.800 |
| Imobiliário SFI | R$ 5.000 |
| MCMV | R$ 800 (família) |
| Veículo | R$ 1.200 |
| Consignado | Contracheque com margem disponível |
| Empresa | Faturamento ≥ R$ 50.000/mês |

*Nota: o bot não bloqueia por renda, apenas captura para a simulação.*

## RN-003: Cálculo SAC (Sistema de Amortização Constante)

```
amortização = valor_financiado / prazo_meses
saldo_devedor(k) = valor_financiado - (k * amortização)
parcela(k) = amortização + (saldo_devedor(k-1) * taxa_mensal)
taxa_mensal = (1 + taxa_anual)^(1/12) - 1
```

Características:
- Primeira parcela é a maior
- Última parcela é a menor
- Amortização constante em todas as parcelas
- Total pago = principal + juros decrescentes

## RN-004: Cálculo PRICE (Sistema Francês)

```
PMT = PV × i / (1 - (1+i)^(-n))
onde:
  PV = valor financiado
  i = taxa mensal
  n = prazo em meses
```

Características:
- Parcela fixa em todo o período
- Composição inicial: mais juros, menos amortização
- Total de juros > SAC para o mesmo prazo

## RN-005: Limites de Prazo por Modalidade

| Modalidade | Mínimo | Máximo |
|-----------|--------|--------|
| Imobiliário | 12 meses | 420 meses (35 anos) |
| Veículo | 6 meses | 84 meses (7 anos) |
| Consignado | 6 meses | 84 meses |
| Pessoal | 6 meses | 60 meses |
| Empresa | 6 meses | 120 meses |
| Equipamento | 6 meses | 120 meses |
| Rural | 6 meses | 120 meses |

*Obs: o bot aceita 6-420 mas a API filtra por modalidade.*

## RN-006: Entrada Mínima (LTV)

| Modalidade | LTV máximo | Entrada mínima |
|-----------|-----------|---------------|
| SFH | 90% | 10% |
| SFI | 80% | 20% |
| Veículo novo | 90% | 10% |
| Veículo usado | 70% | 30% |

## RN-007: Fontes de Taxas (Open Finance)

Ordem de precedência:
1. Open Finance Brasil Fase 1 (API pública, cache 24h)
2. Tabela de fallback hardcoded (taxas de mercado atualizadas na release)
3. Erro 503 se nenhuma fonte disponível

## RN-008: Funil de Leads

```
novo → em_atendimento → proposta_enviada → aprovado → concluido
                                          ↘ reprovado
      ↘ cancelado (qualquer estado)
```

Transições permitidas:
- `novo` → `em_atendimento`, `cancelado`
- `em_atendimento` → `proposta_enviada`, `cancelado`
- `proposta_enviada` → `aprovado`, `reprovado`, `cancelado`
- `aprovado` → `concluido`

## RN-009: Expiração de Sessão

Sessões sem atividade por 24 horas são marcadas como `abandoned` automaticamente.
Uma sessão `abandoned` pode ser retomada enviando "oi" — os dados são preservados.

## RN-010: LGPD — Dados Sensíveis

Campos criptografados em repouso (AES-256-GCM):
- `cpf_encrypted`
- `monthly_income_encrypted`
- `family_income_encrypted`
- `fgts_amount_encrypted`
- `down_payment_amount_encrypted`

O consentimento LGPD deve ser obtido e registrado em `lgpd_consent_at` antes de persistir dados do cliente.

## RN-011: Ordenação dos Resultados de Simulação

Os resultados são ordenados por menor primeira parcela SAC. Em caso de empate, por menor CET anual.
