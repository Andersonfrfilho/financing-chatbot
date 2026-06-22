import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'
import type { ConversationController } from './ConversationController'

export function registerConversationRoutes(router: Router, controller: ConversationController): void {
  // Interno (n8n): log de mensagem — só authenticate (token de serviço)
  router.post('/api/conversations/:whatsapp/messages', authenticate, (req, res) => controller.log(req, res))
  // Painel (usuários com JWT)
  router.get('/api/conversations/:whatsapp/messages', authenticate, authorize(['clients:read']), (req, res) => controller.history(req, res))
  router.get('/api/conversations', authenticate, authorize(['clients:read']), (req, res) => controller.list(req, res))
}
