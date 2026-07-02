import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'
import type { FipeController } from './FipeController'

export function registerFipeRoutes(router: Router, controller: FipeController): void {
  router.get('/api/fipe/price',  authenticate, authorize(['fipe:read']), (req, res) => controller.price(req, res))
  router.get('/api/fipe/models', authenticate, authorize(['fipe:read']), (req, res) => controller.models(req, res))
  router.get('/api/fipe/years',  authenticate, authorize(['fipe:read']), (req, res) => controller.years(req, res))
  router.get('/api/fipe/detail', authenticate, authorize(['fipe:read']), (req, res) => controller.detail(req, res))
}
