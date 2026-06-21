import type { ReceiveWhatsAppWebhookUseCase } from '../../application/use-cases/ReceiveWhatsAppWebhookUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { logger } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'change-me'

const log = logger.child('WebhookController')

export class WebhookController {
  constructor(
    private readonly receiveWebhookUseCase: ReceiveWhatsAppWebhookUseCase,
  ) {}

  async verify(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const log_ = log.child('verify')
    const mode      = request.query['hub.mode']
    const token     = request.query['hub.verify_token']
    const challenge = request.query['hub.challenge']

    log_.debug(LOG_EVENTS.WEBHOOK_VERIFY_START, { mode, tokenMatch: token === VERIFY_TOKEN })

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      log_.info(LOG_EVENTS.WEBHOOK_VERIFY_OK, { challenge })
      response.json(challenge ? parseInt(challenge) : 'ok', 200)
    } else {
      log_.warn(LOG_EVENTS.WEBHOOK_VERIFY_FAILED, { mode, tokenMatch: token === VERIFY_TOKEN })
      response.json({ error: 'Forbidden' }, 403)
    }
  }

  async receive(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const log_ = log.child('receive')
    const signature = request.headers['x-hub-signature-256'] ?? ''
    const nonce     = request.headers['x-request-id'] ?? Date.now().toString()
    const rawBody   = Buffer.from(JSON.stringify(request.body))

    log_.debug(LOG_EVENTS.WEBHOOK_RECEIVED, { nonce, signaturePresent: !!signature })

    await this.receiveWebhookUseCase.execute({
      rawBody,
      signature,
      nonce,
      payload: request.body as Parameters<ReceiveWhatsAppWebhookUseCase['execute']>[0]['payload'],
    })

    log_.info(LOG_EVENTS.WEBHOOK_PROCESSED, { nonce })
    response.json({ status: 'ok' }, 200)
  }
}
