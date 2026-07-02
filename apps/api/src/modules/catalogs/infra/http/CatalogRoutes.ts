import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'
import type { CatalogController } from './CatalogController'

export function registerCatalogRoutes(router: Router, controller: CatalogController) {
  router.get('/api/catalogs/active', authenticate, authorize(['catalogs:read']),  (req, res) => controller.getActive(req, res))
  router.put('/api/catalogs/active', authenticate, authorize(['catalogs:write']), (req, res) => controller.setActive(req, res))
}
