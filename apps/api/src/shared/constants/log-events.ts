export const LOG_EVENTS = {
  // Server lifecycle
  SERVER_STARTING:         'server_starting',
  SERVER_READY:            'server_ready',
  SERVER_FAILED:           'server_failed',

  // HTTP
  REQUEST:                 'request',
  RESPONSE_OK:             'response_ok',
  RESPONSE_ERROR:          'response_error',
  RESPONSE_UNHANDLED:      'response_unhandled',

  // Webhook verification
  WEBHOOK_VERIFY_START:    'webhook_verify_start',
  WEBHOOK_VERIFY_OK:       'webhook_verify_ok',
  WEBHOOK_VERIFY_FAILED:   'webhook_verify_failed',

  // Webhook receive flow
  WEBHOOK_RECEIVED:        'webhook_received',
  WEBHOOK_HMAC_CHECK:      'webhook_hmac_check',
  WEBHOOK_HMAC_OK:         'webhook_hmac_ok',
  WEBHOOK_HMAC_FAILED:     'webhook_hmac_failed',
  WEBHOOK_DUPLICATE:       'webhook_duplicate',
  WEBHOOK_NONCE_STORED:    'webhook_nonce_stored',
  WEBHOOK_MESSAGE:         'webhook_message',
  WEBHOOK_MESSAGE_CACHED:  'webhook_message_cached',
  WEBHOOK_PROCESSED:       'webhook_processed',

  // n8n forward
  N8N_FORWARD_START:       'n8n_forward_start',
  N8N_FORWARD_OK:          'n8n_forward_ok',
  N8N_FORWARD_FAILED:      'n8n_forward_failed',

  // Conversations
  TAKEOVER:                'takeover',

  // Leads
  CREATE_LEAD:             'create_lead',
} as const
