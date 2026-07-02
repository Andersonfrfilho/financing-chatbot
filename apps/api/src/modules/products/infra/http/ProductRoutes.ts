import type { Router } from '@/infra/http/router'
import type { ProductController } from './ProductController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerProductRoutes(router: Router, controller: ProductController) {
  router.get('/api/products',    authenticate, authorize(['products:read']),  (req, res) => controller.list(req, res))
  router.post('/api/products',   authenticate, authorize(['products:write']), (req, res) => controller.create(req, res))
  router.get('/api/products/:id',authenticate, authorize(['products:read']),  (req, res) => controller.get(req, res))
  router.put('/api/products/:id',authenticate, authorize(['products:write']), (req, res) => controller.update(req, res))
  router.delete('/api/products/:id', authenticate, authorize(['products:delete']), (req, res) => controller.remove(req, res))
  router.post('/api/products/:id/retry-sync', authenticate, authorize(['products:write']), (req, res) => controller.retrySync(req, res))
  router.post('/api/products/bulk-import', authenticate, authorize(['products:write']), (req, res) => controller.bulkImport(req, res))
}
