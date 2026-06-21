// Handler: greeting e retomada de sessão
import { MessagesConstants } from '../shared/constants/MessagesConstants'

if (currentState === 'greeting' || isGreeting) {
  if (context.name && !isGreeting) {
    // Cliente tem sessão em andamento
    return {
      response: MessagesConstants.RESUME_SESSION(context.name),
      newState: currentState,
      newContext: context,
      handled: true,
    }
  }

  return {
    response: MessagesConstants.GREETING + '\n\n' + MessagesConstants.FINANCING_TYPE_OPTIONS,
    newState: 'awaiting_financing_type',
    newContext: {},
    handled: true,
  }
}

return { handled: false }
