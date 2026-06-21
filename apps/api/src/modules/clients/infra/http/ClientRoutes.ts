import type { Router } from '@/infra/http/router'
import type { ClientController } from './ClientController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerClientRoutes(router: Router, controller: ClientController) {
  router.get('/api/clients',    authenticate, authorize(['clients:read']),  (req, res) => controller.list(req, res))
  router.get('/api/clients/:id',authenticate, authorize(['clients:read']),  (req, res) => controller.get(req, res))
  router.put('/api/clients/:id',authenticate, authorize(['clients:write']), (req, res) => controller.update(req, res))
  router.delete('/api/clients/:id',authenticate, authorize(['clients:delete']),(req, res) => controller.remove(req, res))
}
