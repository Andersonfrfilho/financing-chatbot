import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'
import type { SimulationController } from './SimulationController'

export function registerSimulationRoutes(router: Router, controller: SimulationController): void {
  router.get('/api/simulations',     authenticate, authorize(['simulations:read']),  (req, res) => controller.list(req, res))
  router.post('/api/simulations',    authenticate, authorize(['simulations:write']), (req, res) => controller.create(req, res))
  router.get('/api/simulations/:id', authenticate, authorize(['simulations:read']),  (req, res) => controller.get(req, res))
}
