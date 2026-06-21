// Handler: coleta dados financeiros e ramifica por tipo de financiamento
import { MessagesConstants } from '../shared/constants/MessagesConstants'

const FINANCIAL_STATES = ['awaiting_monthly_income', 'awaiting_family_income']
if (!FINANCIAL_STATES.includes(currentState)) return { handled: false }

switch (currentState) {

  case 'awaiting_monthly_income': {
    const income = parseAmount(incomingText)
    if (!income) {
      return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_FAMILY_INCOME,
      newState: 'awaiting_family_income',
      newContext: { ...context, monthlyIncome: income },
      handled: true,
    }
  }

  case 'awaiting_family_income': {
    const familyIncome = parseAmount(incomingText)
    if (!familyIncome) {
      return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    }
    const updatedContext = { ...context, familyIncome }

    // Ramifica por tipo de financiamento
    switch (context.financingType) {
      case 'imobiliario':
        return { response: MessagesConstants.ASK_HAS_FGTS, newState: 'awaiting_fgts', newContext: updatedContext, handled: true }
      case 'veiculo':
        return { response: MessagesConstants.ASK_VEHICLE_TYPE, newState: 'awaiting_vehicle_type', newContext: updatedContext, handled: true }
      case 'pessoal':
        return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: updatedContext, handled: true }
      case 'consignado':
        return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: updatedContext, handled: true }
      case 'empresa':
        return { response: MessagesConstants.ASK_CNPJ, newState: 'awaiting_company_cnpj', newContext: updatedContext, handled: true }
      case 'equipamento':
        return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: updatedContext, handled: true }
      case 'rural':
        return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: updatedContext, handled: true }
      default:
        return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: updatedContext, handled: true }
    }
  }

  default:
    return { handled: false }
}
