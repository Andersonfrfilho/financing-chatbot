import type { Router } from '@/infra/http/router'
import type { CategoryController } from './CategoryController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerCategoryRoutes(router: Router, controller: CategoryController) {
  router.get('/api/categories',    authenticate, authorize(['categories:read']),  (req, res) => controller.list(req, res))
  router.post('/api/categories',   authenticate, authorize(['categories:write']), (req, res) => controller.create(req, res))
  router.get('/api/categories/:id',authenticate, authorize(['categories:read']),  (req, res) => controller.get(req, res))
  router.put('/api/categories/:id',authenticate, authorize(['categories:write']), (req, res) => controller.update(req, res))
  router.delete('/api/categories/:id', authenticate, authorize(['categories:delete']), (req, res) => controller.remove(req, res))
  router.post('/api/categories/:id/retry-sync', authenticate, authorize(['categories:write']), (req, res) => controller.retrySync(req, res))
}
