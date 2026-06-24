import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { SimulationController } from './SimulationController'

export function registerSimulationRoutes(router: Router, controller: SimulationController): void {
  router.get('/api/simulations',     authenticate, (req, res) => controller.list(req, res))
  router.post('/api/simulations',    authenticate, (req, res) => controller.create(req, res))
  router.get('/api/simulations/:id', authenticate, (req, res) => controller.get(req, res))
}
