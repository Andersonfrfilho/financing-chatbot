// Handler: fluxo específico para veículos
import { MessagesConstants } from '../shared/constants/MessagesConstants'

const VEHICLE_STATES = ['awaiting_vehicle_type','awaiting_vehicle_value','awaiting_vehicle_year','awaiting_vehicle_down_payment']
if (!VEHICLE_STATES.includes(currentState)) return { handled: false }

switch (currentState) {

  case 'awaiting_vehicle_type': {
    const vehicleType = VEHICLE_TYPE_MAP[incomingText]
    if (!vehicleType) return { response: MessagesConstants.INVALID_OPTION + '\n\n' + MessagesConstants.ASK_VEHICLE_TYPE, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_VEHICLE_VALUE, newState: 'awaiting_vehicle_value', newContext: { ...context, vehicleType }, handled: true }
  }

  case 'awaiting_vehicle_value': {
    const value = parseAmount(incomingText)
    if (!value) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_VEHICLE_YEAR, newState: 'awaiting_vehicle_year', newContext: { ...context, vehicleValue: value }, handled: true }
  }

  case 'awaiting_vehicle_year': {
    const year = parseInt(incomingText)
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      return { response: '❌ Ano inválido. Informe o ano do veículo (ex: 2022):', newState: currentState, newContext: context, handled: true }
    }
    return { response: MessagesConstants.ASK_VEHICLE_DOWN_PAYMENT, newState: 'awaiting_vehicle_down_payment', newContext: { ...context, vehicleYear: year }, handled: true }
  }

  case 'awaiting_vehicle_down_payment': {
    const down = parseAmount(incomingText) ?? 0
    return {
      response: MessagesConstants.ASK_TERM(12, 84),
      newState: 'awaiting_term',
      newContext: { ...context, downPaymentAmount: down },
      handled: true,
    }
  }

  default:
    return { handled: false }
}
