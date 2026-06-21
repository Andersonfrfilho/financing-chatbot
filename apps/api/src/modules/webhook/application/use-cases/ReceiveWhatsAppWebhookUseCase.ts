import { timingSafeEqual, createHmac } from 'crypto'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { UnauthorizedError, ConflictError } from '@/shared/errors/AppError'

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
    if (!verifyHmac(input.rawBody, input.signature)) {
      throw new UnauthorizedError('invalid_webhook_signature')
    }

    const nonceKey = `webhook:nonce:${input.nonce}`
    const nonceExists = await this.cache.exists(nonceKey)
    if (nonceExists) throw new ConflictError('Duplicate webhook delivery')
    await this.cache.set(nonceKey, '1', NONCE_TTL_SECONDS)

    // Mensagens processadas pelo n8n via fluxo conversacional
    // Este receiver apenas valida, deduplica e registra o evento
    for (const entry of input.payload.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages ?? []
        for (const message of messages) {
          await this.cache.set(
            `wa:msg:${message.id}`,
            JSON.stringify({ from: message.from, type: message.type }),
            3600,
          )
        }
      }
    }
  }
}
