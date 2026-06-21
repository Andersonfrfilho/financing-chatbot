// Handler: coleta dados pessoais (nome, CPF, nascimento, estado civil, email, cidade, estado)
import { MessagesConstants } from '../shared/constants/MessagesConstants'

const PERSONAL_STATES = ['awaiting_name','awaiting_cpf','awaiting_birth_date','awaiting_civil_status','awaiting_email','awaiting_city','awaiting_state']
if (!PERSONAL_STATES.includes(currentState)) return { handled: false }

switch (currentState) {

  case 'awaiting_name': {
    if (incomingText.length < 3) {
      return { response: 'Por favor, informe seu nome completo:', newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_CPF,
      newState: 'awaiting_cpf',
      newContext: { ...context, name: incomingText },
      handled: true,
    }
  }

  case 'awaiting_cpf': {
    const digits = incomingText.replace(/\D/g, '')
    if (!isValidCPF(digits)) {
      return { response: MessagesConstants.INVALID_CPF, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_BIRTH_DATE,
      newState: 'awaiting_birth_date',
      newContext: { ...context, cpf: digits },
      handled: true,
    }
  }

  case 'awaiting_birth_date': {
    if (!isValidDate(incomingText)) {
      return { response: MessagesConstants.INVALID_DATE, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_CIVIL_STATUS,
      newState: 'awaiting_civil_status',
      newContext: { ...context, birthDate: incomingText },
      handled: true,
    }
  }

  case 'awaiting_civil_status': {
    const civilStatus = CIVIL_STATUS_MAP[incomingText]
    if (!civilStatus) {
      return { response: MessagesConstants.INVALID_OPTION + '\n\n' + MessagesConstants.ASK_CIVIL_STATUS, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_EMAIL,
      newState: 'awaiting_email',
      newContext: { ...context, civilStatus },
      handled: true,
    }
  }

  case 'awaiting_email': {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incomingText)) {
      return { response: MessagesConstants.INVALID_EMAIL, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_CITY,
      newState: 'awaiting_city',
      newContext: { ...context, email: incomingText.toLowerCase() },
      handled: true,
    }
  }

  case 'awaiting_city': {
    if (incomingText.length < 2) {
      return { response: 'Informe o nome da sua cidade:', newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_STATE,
      newState: 'awaiting_state',
      newContext: { ...context, city: incomingText },
      handled: true,
    }
  }

  case 'awaiting_state': {
    const stateUpper = incomingText.toUpperCase().trim()
    if (!VALID_STATES.includes(stateUpper)) {
      return { response: MessagesConstants.INVALID_STATE, newState: currentState, newContext: context, handled: true }
    }
    return {
      response: MessagesConstants.ASK_MONTHLY_INCOME,
      newState: 'awaiting_monthly_income',
      newContext: { ...context, state: stateUpper },
      handled: true,
    }
  }

  default:
    return { handled: false }
}
