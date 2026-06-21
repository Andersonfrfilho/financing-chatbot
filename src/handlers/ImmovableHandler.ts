// Handler: fluxo específico para imobiliário
import { MessagesConstants } from '../shared/constants/MessagesConstants'

const IMOB_STATES = ['awaiting_fgts','awaiting_fgts_amount','awaiting_down_payment','awaiting_down_payment_amount','awaiting_property_value','awaiting_property_type','awaiting_property_city','awaiting_property_state']
if (!IMOB_STATES.includes(currentState)) return { handled: false }

switch (currentState) {

  case 'awaiting_fgts': {
    if (incomingText === '1' || /^sim$/i.test(incomingText)) {
      return { response: MessagesConstants.ASK_FGTS_AMOUNT, newState: 'awaiting_fgts_amount', newContext: { ...context, hasFgts: true }, handled: true }
    }
    return { response: MessagesConstants.ASK_HAS_DOWN_PAYMENT, newState: 'awaiting_down_payment', newContext: { ...context, hasFgts: false, fgtsAmount: 0 }, handled: true }
  }

  case 'awaiting_fgts_amount': {
    const amount = parseAmount(incomingText)
    if (!amount) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_HAS_DOWN_PAYMENT, newState: 'awaiting_down_payment', newContext: { ...context, fgtsAmount: amount }, handled: true }
  }

  case 'awaiting_down_payment': {
    if (incomingText === '1' || /^sim$/i.test(incomingText)) {
      return { response: MessagesConstants.ASK_DOWN_PAYMENT, newState: 'awaiting_down_payment_amount', newContext: { ...context, hasDownPayment: true }, handled: true }
    }
    return { response: MessagesConstants.ASK_PROPERTY_VALUE, newState: 'awaiting_property_value', newContext: { ...context, hasDownPayment: false, downPaymentAmount: 0 }, handled: true }
  }

  case 'awaiting_down_payment_amount': {
    const amount = parseAmount(incomingText)
    if (!amount) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_PROPERTY_VALUE, newState: 'awaiting_property_value', newContext: { ...context, downPaymentAmount: amount }, handled: true }
  }

  case 'awaiting_property_value': {
    const value = parseAmount(incomingText)
    if (!value) return { response: MessagesConstants.INVALID_NUMBER, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_PROPERTY_TYPE, newState: 'awaiting_property_type', newContext: { ...context, propertyValue: value }, handled: true }
  }

  case 'awaiting_property_type': {
    const propertyType = PROPERTY_TYPE_MAP[incomingText]
    if (!propertyType) return { response: MessagesConstants.INVALID_OPTION + '\n\n' + MessagesConstants.ASK_PROPERTY_TYPE, newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_PROPERTY_CITY, newState: 'awaiting_property_city', newContext: { ...context, propertyType }, handled: true }
  }

  case 'awaiting_property_city': {
    if (incomingText.length < 2) return { response: 'Informe a cidade do imóvel:', newState: currentState, newContext: context, handled: true }
    return { response: MessagesConstants.ASK_PROPERTY_STATE, newState: 'awaiting_property_state', newContext: { ...context, propertyCity: incomingText }, handled: true }
  }

  case 'awaiting_property_state': {
    const stateUpper = incomingText.toUpperCase().trim()
    if (!VALID_STATES.includes(stateUpper)) return { response: MessagesConstants.INVALID_STATE, newState: currentState, newContext: context, handled: true }
    return {
      response: MessagesConstants.ASK_TERM(12, 420),
      newState: 'awaiting_term',
      newContext: { ...context, propertyState: stateUpper },
      handled: true,
    }
  }

  default:
    return { handled: false }
}
