import type { Router } from '@/infra/http/router'
import type { ClientController } from './ClientController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerClientRoutes(router: Router, controller: ClientController) {
  router.get('/api/clients', authenticate, authorize(['clients:read']), (res, req) => controller.list(res, req))
  router.get('/api/clients/:id', authenticate, authorize(['clients:read']), (res, req) => controller.get(res, req))
  router.put('/api/clients/:id', authenticate, authorize(['clients:write']), (res, req, body) => controller.update(res, req, body))
  router.delete('/api/clients/:id', authenticate, authorize(['clients:delete']), (res, req) => controller.remove(res, req))
}
