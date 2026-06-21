# Open Finance Brasil — Integração

## Fase 1 (Dados Abertos)

O sistema usa exclusivamente a **Fase 1** do Open Finance Brasil, que disponibiliza dados públicos sem necessidade de autenticação do usuário.

### Endpoints Consultados

| Banco | Base URL |
|-------|----------|
| CAIXA | `https://opendata.caixa.gov.br/open-banking/products-services/v1` |
| Santander | `https://api.santander.com.br/open-banking/products-services/v1` |
| Banco do Brasil | `https://opendata.bb.com.br/open-banking/products-services/v1` |
| Itaú | `https://opendata.itau.com.br/open-banking/products-services/v1` |
| Bradesco | `https://opendata.bradesco.com.br/open-banking/products-services/v1` |

### Produto consultado: Real Estate Credit

```
GET /personal-loans
GET /business-loans  
GET /financings
```

### Estratégia de Cache

```
Consulta Open Finance → cache Redis (chave: open-finance:{bankCode}:{modality})
TTL: 24 horas (taxas não mudam com frequência)
Fallback: tabela hardcoded se API indisponível
```

### Taxas de Fallback (mercado, 2026)

| Banco | SFH | Veículo | Pessoal | Consignado |
|-------|-----|---------|---------|------------|
| CAIXA | 8.2% | — | — | 6.5% |
| Santander | 8.9% | 15.5% | 28.0% | 7.2% |
| Banco do Brasil | 8.5% | 14.0% | 25.0% | 6.8% |
| Itaú | 9.1% | 16.0% | 30.0% | 7.5% |
| Bradesco | 8.8% | 15.0% | 27.0% | 7.0% |

### Atualização Manual de Taxas

Administradores podem cadastrar taxas manualmente via:

```
POST /api/banks/:id/rates
{
  "modality": "SFH",
  "rateAnnual": "0.082",
  "effectiveDate": "2026-06-01",
  "source": "manual"
}
```

Taxas manuais sobrepõem o fallback mas não o cache do Open Finance.

### Resilência

```
try:
  1. Verificar cache Redis (TTL: 24h)
  2. Buscar Open Finance API (timeout: 8s)
  3. Salvar no cache
  4. Persistir em bank_rates
catch:
  Usar fallback hardcoded
  Log de erro para monitoring
```
