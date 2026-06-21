import type { ReceiveWhatsAppWebhookUseCase } from '../../application/use-cases/ReceiveWhatsAppWebhookUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'change-me'

export class WebhookController {
  constructor(
    private readonly receiveWebhookUseCase: ReceiveWhatsAppWebhookUseCase,
  ) {}

  async verify(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const mode = request.query['hub.mode']
    const token = request.query['hub.verify_token']
    const challenge = request.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      response.json(challenge ? parseInt(challenge) : 'ok', 200)
    } else {
      response.json({ error: 'Forbidden' }, 403)
    }
  }

  async receive(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const signature = request.headers['x-hub-signature-256'] ?? ''
    const nonce = request.headers['x-request-id'] ?? Date.now().toString()
    const rawBody = Buffer.from(JSON.stringify(request.body))

    await this.receiveWebhookUseCase.execute({
      rawBody,
      signature,
      nonce,
      payload: request.body as Parameters<ReceiveWhatsAppWebhookUseCase['execute']>[0]['payload'],
    })

    response.json({ status: 'ok' }, 200)
  }
}
