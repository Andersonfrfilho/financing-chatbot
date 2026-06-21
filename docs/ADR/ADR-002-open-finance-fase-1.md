# ADR-002: Open Finance Fase 1 apenas para v1

**Status:** Aceito  
**Data:** 2026-06-19  
**Autores:** Time de desenvolvimento

---

## Contexto

Para comparar taxas entre bancos, precisamos de dados atualizados de CET e taxas de juros. O Open Finance Brasil disponibiliza esses dados em três fases com requisitos diferentes.

## Decisão

Usar exclusivamente a **Fase 1** do Open Finance Brasil para v1 — APIs de dados abertos, sem autenticação, sem cadastro como participante no BCB.

## Motivação

- **Fase 1** (dados abertos): qualquer sistema pode consultar as APIs públicas dos bancos sem autenticação. Suficiente para obter taxas indicativas de financiamento.
- **Fase 2/3** requerem: certificação como Participante pelo Banco Central (processo de 3–12 meses), infraestrutura de certificados digitais, consentimento explícito do usuário e arquitetura OAuth 2.0 compliant — inviável para v1.
- As taxas da Fase 1 são indicativas e suficientes para o contexto de simulação (cliente não está contratando, apenas simulando).

## Implementação

```
Requisição de simulação
    ↓
FetchAndCacheBankRatesUseCase
    ↓ (cache Redis 24h)
HttpOpenFinanceProviderImplementation
    ├── GET {bank_base_url}/open-banking/products-services/v1/{path}
    │   timeout: 8s
    ├── Sucesso → parse + persist em bank_rates + retornar
    └── Falha → getFallbackRates() (taxas hardcoded por banco/modalidade)
```

## Bancos Suportados

| Banco | Código | Base URL Open Finance |
|-------|--------|----------------------|
| Caixa | CAIXA | `https://opendata.api.caixa.gov.br` |
| Santander | SANTANDER | `https://openbanking.santander.com.br` |
| Banco do Brasil | BB | `https://opendata.api.bb.com.br` |
| Itaú | ITAU | `https://secure.api.itau/openbanking` |
| Bradesco | BRADESCO | `https://proxy.api.prebanco.com.br` |

## Fallback

Se a API do banco não estiver disponível ou retornar erro, o sistema usa taxas de mercado hardcoded (atualizadas em cada release), garantindo que o bot nunca fica sem resultado.

## Consequências

- Taxas são indicativas — não contractuais (disclaimer deve aparecer no resultado)
- Cache de 24h significa que taxas podem ter até 1 dia de defasagem
- Administradores podem cadastrar taxas manuais via `POST /api/banks/:id/rates` para sobrescrever

## Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Open Finance Fase 2/3 | Requer certificação BCB (3–12 meses), inviável para v1 |
| Scraping de sites de bancos | Viola ToS, frágil, risco legal |
| API paga de agregação (Belvo, Tecnospeed) | Custo mensal + dependência de terceiro; desnecessário para Fase 1 |
| Taxas apenas manuais | Não escala; corretor precisa atualizar manualmente |

## Roadmap v2

Integração com Open Finance Fase 2/3 via hub intermediador (Tecnospeed ou Belvo) para taxas personalizadas com consentimento do cliente.
