// Handler: seleção de prazo e disparo da simulação
import { MessagesConstants } from '../shared/constants/MessagesConstants'

if (currentState !== 'awaiting_term') return { handled: false }

let termMonths: number | null = null

// Atalhos (1-5) ou número livre
if (TERM_SHORTCUTS[incomingText]) {
  termMonths = TERM_SHORTCUTS[incomingText]
} else {
  const parsed = parseInt(incomingText)
  if (!isNaN(parsed) && parsed >= 6 && parsed <= 420) {
    termMonths = parsed
  }
}

if (!termMonths) {
  return {
    response: '❌ Prazo inválido. Informe um número entre 6 e 420 (meses):',
    newState: currentState,
    newContext: context,
    handled: true,
  }
}

// Determina requestedAmount e downPayment por tipo
const requestedAmount = context.propertyValue ?? context.vehicleValue ?? context.loanAmount ?? 0
const downPaymentAmount = context.downPaymentAmount ?? 0
const fgtsAmount = context.fgtsAmount ?? 0

return {
  response: `⏳ Calculando simulação para *${context.name}*...\n\nConsultando taxas dos principais bancos do mercado.`,
  newState: 'simulation_ready',
  newContext: {
    ...context,
    termMonths,
    requestedAmount,
    downPaymentAmount,
    fgtsAmount,
  },
  triggerSimulation: true,
  simulationPayload: {
    whatsappNumber: phone,
    financingType: context.financingType,
    requestedAmount,
    downPaymentAmount,
    fgtsAmount,
    termMonths,
    propertyValue: context.propertyValue,
    propertyType: context.propertyType,
    propertyCity: context.propertyCity,
    propertyState: context.propertyState,
    vehicleType: context.vehicleType,
    vehicleYear: context.vehicleYear,
    metadata: {
      employmentType: context.employmentType,
      employer: context.employer,
      cnpj: context.cnpj,
      companyRevenue: context.companyRevenue,
    },
  },
  handled: true,
}
