# Plano de Testes

## Testes Unitários (bun test)

### Motor de Simulação

**SacCalculatorService** — `src/tests/SacCalculatorService.test.ts`
- ✅ Primeira parcela calculada corretamente
- ✅ Última parcela calculada corretamente
- ✅ Parcelas decrescentes (invariante SAC)
- ✅ 360 parcelas geradas para prazo de 360 meses
- ✅ totalCost = principal + totalInterest
- ✅ Cenário veículo (taxa maior, prazo menor)

**PriceCalculatorService** — `src/tests/PriceCalculatorService.test.ts`
- ✅ PMT calculado pela fórmula correta
- ✅ Todas as parcelas iguais (invariante PRICE)
- ✅ 360 parcelas geradas
- ✅ totalCost = n × PMT
- ✅ Saldo final ≈ 0 (sem resíduo matemático)
- ✅ PRICE totalInterest > SAC totalInterest (mesmo prazo)
- ✅ Cenário consignado

### Executar

```bash
cd apps/api && bun test
```

## Testes de Integração (a implementar)

### Bot Flow (Milestone 3)
- [ ] Fluxo completo imobiliário (new → simulation_ready)
- [ ] Fluxo completo veículo
- [ ] Fluxo empréstimo pessoal
- [ ] Comando cancelar em qualquer estado
- [ ] Comando recomeçar preserva histórico
- [ ] Retomada de sessão existente
- [ ] CPF inválido → rejeita e pede novamente
- [ ] Valor inválido → rejeita e pede novamente

### API (Milestone 4)
- [ ] POST /api/auth/login — sucesso e falha
- [ ] Refresh token com token válido e expirado
- [ ] POST /api/simulations — todos os 7 tipos
- [ ] GET /api/dashboard/stats — retorna estrutura correta
- [ ] RBAC — usuário sem permissão recebe 403

## Testes de Carga (a implementar)

- 100 simulações simultâneas (máx 10s cada)
- 500 mensagens WhatsApp/min (processamento correto)
- Cache Redis hit rate > 90% para taxas bancárias

## Executar Testes

```bash
make test          # Unitários
make typecheck     # Type checking TypeScript
```
