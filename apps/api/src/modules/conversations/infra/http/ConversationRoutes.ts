import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'
import type { ConversationController } from './ConversationController'

export function registerConversationRoutes(router: Router, controller: ConversationController): void {
  // Interno (n8n): só authenticate (token de serviço)
  router.post('/api/conversations/:whatsapp/messages', authenticate, (req, res) => controller.log(req, res))
  router.post('/api/conversations/:whatsapp/request-human', authenticate, (req, res) => controller.requestHuman(req, res))
  // Painel (usuários com JWT)
  router.get('/api/conversations/:whatsapp/messages', authenticate, authorize(['clients:read']), (req, res) => controller.history(req, res))
  router.get('/api/conversations', authenticate, authorize(['clients:read']), (req, res) => controller.list(req, res))
  // Takeover humano
  router.post('/api/conversations/:whatsapp/takeover',  authenticate, authorize(['clients:write']), (req, res) => controller.assume(req, res))
  router.post('/api/conversations/:whatsapp/release',   authenticate, authorize(['clients:write']), (req, res) => controller.release(req, res))
  router.post('/api/conversations/:whatsapp/finalize',  authenticate, authorize(['clients:write']), (req, res) => controller.finalize(req, res))
  router.post('/api/conversations/:whatsapp/send',      authenticate, authorize(['clients:write']), (req, res) => controller.send(req, res))
  router.post('/api/conversations/:whatsapp/read',      authenticate, authorize(['clients:read']),  (req, res) => controller.read(req, res))
}
