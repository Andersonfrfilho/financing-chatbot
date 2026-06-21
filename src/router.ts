// Router principal — delega para handlers em ordem de prioridade

// 1. Global (cancel/restart) — sempre primeiro
const globalResult = await runHandler('GlobalHandler')
if (globalResult.handled) return globalResult

// 2. Greeting / retomada
const greetingResult = await runHandler('GreetingHandler')
if (greetingResult.handled) return greetingResult

// 3. Seleção de tipo de financiamento
const typeResult = await runHandler('FinancingTypeHandler')
if (typeResult.handled) return typeResult

// 4. Dados pessoais
const personalResult = await runHandler('PersonalDataHandler')
if (personalResult.handled) return personalResult

// 5. Dados financeiros + ramificação
const financialResult = await runHandler('FinancialDataHandler')
if (financialResult.handled) return financialResult

// 6. Imobiliário
const imobResult = await runHandler('ImmovableHandler')
if (imobResult.handled) return imobResult

// 7. Veículo
const vehicleResult = await runHandler('VehicleHandler')
if (vehicleResult.handled) return vehicleResult

// 8. Empréstimos (pessoal, consignado, empresa, equipamento, rural)
const loanResult = await runHandler('LoanHandler')
if (loanResult.handled) return loanResult

// 9. Prazo e disparo de simulação
const termResult = await runHandler('TermAndSimulationHandler')
if (termResult.handled) return termResult

// 10. Resultado e handoff
const resultResult = await runHandler('SimulationResultHandler')
if (resultResult.handled) return resultResult

// Fallback
return {
  response: 'Desculpe, não entendi sua mensagem. Envie "oi" para recomeçar ou "cancelar" para sair.',
  newState: currentState,
  newContext: context,
  handled: true,
}
