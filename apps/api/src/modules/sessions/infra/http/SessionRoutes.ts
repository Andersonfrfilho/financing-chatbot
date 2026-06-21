import type { Router } from '@/infra/http/router'
import type { SessionController } from './SessionController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerSessionRoutes(router: Router, controller: SessionController) {
  router.get('/api/sessions',                          authenticate, authorize(['sessions:read']),  (req, res) => controller.list(req, res))
  router.get('/api/sessions/stats',                    authenticate, authorize(['sessions:read']),  (req, res) => controller.countByState(req, res))
  router.delete('/api/sessions/:whatsappNumber',       authenticate, authorize(['sessions:write']), (req, res) => controller.reset(req, res))
}
