import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { FipeController } from './FipeController'

export function registerFipeRoutes(router: Router, controller: FipeController): void {
  router.get('/api/fipe/price', authenticate, (req, res) => controller.price(req, res))
  router.get('/api/fipe/models', authenticate, (req, res) => controller.models(req, res))
  router.get('/api/fipe/years', authenticate, (req, res) => controller.years(req, res))
  router.get('/api/fipe/detail', authenticate, (req, res) => controller.detail(req, res))
}
