// Handler: apresenta resultados da simulação e oferta handoff
import { MessagesConstants } from '../shared/constants/MessagesConstants'

if (currentState !== 'simulation_ready') return { handled: false }

// Resposta pós-simulação: cliente recebeu os resultados, agora decide
if (incomingText === '1' || /^sim/i.test(incomingText)) {
  return {
    response: MessagesConstants.HUMAN_HANDOFF,
    newState: 'human_handoff',
    newContext: context,
    triggerHandoff: true,
    handled: true,
  }
}

if (incomingText === '2' || /^não|nao/i.test(incomingText)) {
  return {
    response: '😊 Obrigado! Se precisar de mais simulações ou tiver dúvidas, é só enviar "oi".',
    newState: 'completed',
    newContext: context,
    handled: true,
  }
}

// Cliente quer nova simulação
if (isGreeting) {
  return {
    response: MessagesConstants.GREETING + '\n\n' + MessagesConstants.FINANCING_TYPE_OPTIONS,
    newState: 'awaiting_financing_type',
    newContext: {},
    handled: true,
  }
}

return { handled: false }
