export const WS_EVENTS = {
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  SIMULATION_COMPLETED: 'simulation.completed',
  CLIENT_CAPTURED: 'client.captured',
} as const

export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS]
