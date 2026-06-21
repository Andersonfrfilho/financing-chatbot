import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { FipeController } from './FipeController'

export function registerFipeRoutes(router: Router, controller: FipeController): void {
  router.get('/api/fipe/price', authenticate, (req, res) => controller.price(req, res))
}
