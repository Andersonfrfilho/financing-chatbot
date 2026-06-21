import type { Router } from '@/infra/http/router'
import type { UserController } from './UserController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerUserRoutes(router: Router, controller: UserController) {
  router.get('/api/users', authenticate, authorize(['users:read']), (res, req) => controller.list(res, req))
  router.post('/api/users', authenticate, authorize(['users:write']), (res, req, body) => controller.create(res, req, body))
  router.put('/api/users/:id', authenticate, authorize(['users:write']), (res, req, body) => controller.update(res, req, body))
  router.get('/api/roles', authenticate, (res) => controller.listRoles(res))
}
