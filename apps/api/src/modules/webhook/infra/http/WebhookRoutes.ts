import type { Router } from '@/infra/http/router'
import type { WebhookController } from './WebhookController'

export function registerWebhookRoutes(router: Router, controller: WebhookController): void {
  router.get('/api/webhook/whatsapp', (req, res) => controller.verify(req, res))
  router.post('/api/webhook/whatsapp', (req, res) => controller.receive(req, res))
}
