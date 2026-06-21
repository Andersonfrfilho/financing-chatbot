// Handler: seleção do tipo de financiamento
import { MessagesConstants } from '../shared/constants/MessagesConstants'

if (currentState !== 'awaiting_financing_type') return { handled: false }

// Retomada: cliente diz "1" para continuar, "2" para nova simulação
if (context.name && (incomingText === '1' || incomingText === '2')) {
  if (incomingText === '1') {
    // Continua de onde parou
    return {
      response: `Ótimo! Continuando sua simulação de *${context.financingType ?? 'financiamento'}*. De onde paramos:`,
      newState: currentState,
      newContext: context,
      handled: true,
    }
  } else {
    // Nova simulação
    return {
      response: MessagesConstants.FINANCING_TYPE_OPTIONS,
      newState: 'awaiting_financing_type',
      newContext: {},
      handled: true,
    }
  }
}

const financingType = FINANCING_TYPE_MAP[incomingText.toLowerCase()]
if (!financingType) {
  return {
    response: MessagesConstants.INVALID_OPTION + '\n\n' + MessagesConstants.FINANCING_TYPE_OPTIONS,
    newState: 'awaiting_financing_type',
    newContext: context,
    handled: true,
  }
}

const typeLabels: Record<string, string> = {
  imobiliario: 'Financiamento Imobiliário',
  veiculo: 'Financiamento de Veículo',
  pessoal: 'Empréstimo Pessoal',
  consignado: 'Crédito Consignado',
  empresa: 'Crédito para Empresa',
  equipamento: 'Financiamento de Equipamentos',
  rural: 'Crédito Rural',
}

return {
  response: `Perfeito! Vou simular *${typeLabels[financingType]}* para você.\n\nPrimeiro, preciso de algumas informações.\n\n${MessagesConstants.ASK_NAME}`,
  newState: 'awaiting_name',
  newContext: { ...context, financingType },
  handled: true,
}
