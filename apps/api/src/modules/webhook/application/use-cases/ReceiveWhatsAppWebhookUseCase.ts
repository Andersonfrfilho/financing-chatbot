import { timingSafeEqual, createHmac } from 'crypto'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { UnauthorizedError, ConflictError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'

const WEBHOOK_SECRET = process.env.WEBHOOK_VERIFY_TOKEN ?? 'change-webhook-secret'
const NONCE_TTL_SECONDS = 300

function verifyHmac(rawBody: Buffer, signature: string): boolean {
  if (!signature.startsWith('sha256=')) return false
  const expected = Buffer.from(signature.slice(7), 'hex')
  const actual = Buffer.from(
    createHmac('sha256', process.env.WHATSAPP_ACCESS_TOKEN ?? WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex'),
    'hex',
  )
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

interface WhatsAppMessage {
  id: string
  from: string
  type: string
  text?: { body: string }
  interactive?: { type: string; button_reply?: { id: string; title: string } }
  timestamp: string
}

interface WebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        messages?: WhatsAppMessage[]
        metadata?: { display_phone_number: string; phone_number_id: string }
      }
    }>
  }>
}

interface ReceiveInput {
  rawBody: Buffer
  signature: string
  nonce: string
  payload: WebhookPayload
}

export class ReceiveWhatsAppWebhookUseCase {
  constructor(private readonly cache: CacheProvider) {}

  async execute(input: ReceiveInput): Promise<void> {
    logger.debug(LOG_EVENTS.WEBHOOK_RECEIVED, { nonce: input.nonce, signature: input.signature ? 'present' : 'missing' })

    if (!verifyHmac(input.rawBody, input.signature)) {
      logger.warn(LOG_EVENTS.WEBHOOK_HMAC_FAILED, { nonce: input.nonce, signature: input.signature?.slice(0, 20) })
      throw new UnauthorizedError('invalid_webhook_signature')
    }
    logger.debug(LOG_EVENTS.WEBHOOK_HMAC_OK, { nonce: input.nonce })

    const nonceKey = `webhook:nonce:${input.nonce}`
    const nonceExists = await this.cache.exists(nonceKey)
    if (nonceExists) {
      logger.warn(LOG_EVENTS.WEBHOOK_DUPLICATE, { nonce: input.nonce })
      throw new ConflictError('Duplicate webhook delivery')
    }
    await this.cache.set(nonceKey, '1', NONCE_TTL_SECONDS)

    for (const entry of input.payload.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages ?? []
        for (const message of messages) {
          logger.info(LOG_EVENTS.WEBHOOK_MESSAGE, { id: message.id, from: message.from, type: message.type })
          await this.cache.set(
            `wa:msg:${message.id}`,
            JSON.stringify({ from: message.from, type: message.type }),
            3600,
          )
          logger.debug(LOG_EVENTS.WEBHOOK_MESSAGE_CACHED, { id: message.id })
        }
      }
    }

    logger.info(LOG_EVENTS.WEBHOOK_PROCESSED, { nonce: input.nonce })
  }
}
