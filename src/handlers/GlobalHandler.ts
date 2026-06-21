// Handler global: cancel, restart — roda antes de qualquer outro handler
import { MessagesConstants } from '../shared/constants/MessagesConstants'

if (isCancel) {
  return {
    response: MessagesConstants.CANCEL_FLOW,
    newState: 'abandoned',
    newContext: {},
    handled: true,
  }
}

if (isRestart) {
  return {
    response: MessagesConstants.RESTART_FLOW + '\n\n' + MessagesConstants.FINANCING_TYPE_OPTIONS,
    newState: 'awaiting_financing_type',
    newContext: {},
    handled: true,
  }
}

return { handled: false }
