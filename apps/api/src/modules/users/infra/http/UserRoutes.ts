import type { Router } from '@/infra/http/router'
import type { UserController } from './UserController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerUserRoutes(router: Router, controller: UserController) {
  router.get('/api/users',      authenticate, authorize(['users:read']),  (req, res) => controller.list(req, res))
  router.post('/api/users',     authenticate, authorize(['users:write']), (req, res) => controller.create(req, res))
  router.put('/api/users/:id',  authenticate, authorize(['users:write']), (req, res) => controller.update(req, res))
  router.get('/api/roles',      authenticate,                             (req, res) => controller.listRoles(req, res))
}
