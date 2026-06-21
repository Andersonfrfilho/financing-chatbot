import type { Router } from '@/infra/http/router'
import type { SessionController } from './SessionController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerSessionRoutes(router: Router, controller: SessionController) {
  router.get('/api/sessions', authenticate, authorize(['sessions:read']), (res, req) => controller.list(res, req))
  router.get('/api/sessions/stats', authenticate, authorize(['sessions:read']), (res) => controller.countByState(res))
  router.delete('/api/sessions/:whatsappNumber', authenticate, authorize(['sessions:write']), (res, req) => controller.reset(res, req))
}
