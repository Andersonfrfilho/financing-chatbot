// Handler: pessoal, consignado, empresa, equipamentos, rural
import { MessagesConstants } from '../shared/constants/MessagesConstants'

const LOAN_STATES = ['awaiting_loan_amount','awaiting_employment_type','awaiting_employer','awaiting_company_cnpj','awaiting_company_revenue','awaiting_loan_purpose']
if (!LOAN_STATES.includes(currentState)) return { handled: false }

switch (currentState) {

  case 'awaiting_loan_amount': {
    const amount = parseAmount(incomingText)
    if (!amount) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    const updatedContext = { ...context, loanAmount: amount, propertyValue: amount, downPaymentAmount: 0 }

    if (context.financingType === 'consignado') {
      return { response: MessagesConstants.ASK_EMPLOYMENT_TYPE, newState: 'awaiting_employment_type', newContext: updatedContext, handled: true }
    }
    const maxTerm = context.financingType === 'pessoal' ? 84 : context.financingType === 'rural' ? 120 : 60
    return { response: MessagesConstants.ASK_TERM(6, maxTerm), newState: 'awaiting_term', newContext: updatedContext, handled: true }
  }

  case 'awaiting_employment_type': {
    const employmentType = EMPLOYMENT_TYPE_MAP[incomingText]
    if (!employmentType) return { response: MessagesConstants.INVALID_OPTION + '\n\n' + MessagesConstants.ASK_EMPLOYMENT_TYPE, newState: currentState, newContext: context, handled: true }
    const updatedContext = { ...context, employmentType }
    if (employmentType === 'aposentado_inss') {
      return { response: MessagesConstants.ASK_TERM(6, 84), newState: 'awaiting_term', newContext: { ...updatedContext, employer: 'INSS' }, handled: true }
    }
    return { response: MessagesConstants.ASK_EMPLOYER, newState: 'awaiting_employer', newContext: updatedContext, handled: true }
  }

  case 'awaiting_employer': {
    if (incomingText.length < 2) return { response: MessagesConstants.ASK_EMPLOYER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_TERM(6, 96), newState: 'awaiting_term', newContext: { ...context, employer: incomingText }, handled: true }
  }

  case 'awaiting_company_cnpj': {
    const cnpjDigits = incomingText.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) return { response: '❌ CNPJ inválido. Informe os 14 dígitos:', newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_COMPANY_REVENUE, newState: 'awaiting_company_revenue', newContext: { ...context, cnpj: cnpjDigits }, handled: true }
  }

  case 'awaiting_company_revenue': {
    const revenue = parseAmount(incomingText)
    if (!revenue) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_LOAN_AMOUNT, newState: 'awaiting_loan_amount', newContext: { ...context, companyRevenue: revenue }, handled: true }
  }

  default:
    return { handled: false }
}
