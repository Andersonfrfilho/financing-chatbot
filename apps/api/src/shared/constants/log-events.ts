export const LOG_EVENTS = {
  // Server lifecycle
  SERVER_STARTING:    'server_starting',
  SERVER_READY:       'server_ready',
  SERVER_FAILED:      'server_failed',

  // HTTP
  REQUEST:            'request',
  RESPONSE_OK:        'response_ok',
  RESPONSE_ERROR:     'response_error',
  RESPONSE_UNHANDLED: 'response_unhandled',

  // Webhook
  WEBHOOK_RECEIVED:        'webhook_received',
  WEBHOOK_HMAC_OK:         'webhook_hmac_ok',
  WEBHOOK_HMAC_FAILED:     'webhook_hmac_failed',
  WEBHOOK_DUPLICATE:       'webhook_duplicate',
  WEBHOOK_MESSAGE:         'webhook_message',
  WEBHOOK_MESSAGE_CACHED:  'webhook_message_cached',
  WEBHOOK_PROCESSED:       'webhook_processed',
} as const
