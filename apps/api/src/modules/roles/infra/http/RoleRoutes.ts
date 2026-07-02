import type { Router } from '@/infra/http/router'
import type { RoleController } from './RoleController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerRoleRoutes(router: Router, controller: RoleController) {
  router.get('/api/roles',                      authenticate, authorize(['roles:read']),   (req, res) => controller.list(req, res))
  router.get('/api/roles/permissions-catalog',   authenticate, authorize(['roles:read']),   (req, res) => controller.permissionsCatalog(req, res))
  router.post('/api/roles',                      authenticate, authorize(['roles:write']),  (req, res) => controller.create(req, res))
  router.put('/api/roles/:id',                   authenticate, authorize(['roles:write']),  (req, res) => controller.update(req, res))
  router.delete('/api/roles/:id',                authenticate, authorize(['roles:delete']), (req, res) => controller.remove(req, res))
}
