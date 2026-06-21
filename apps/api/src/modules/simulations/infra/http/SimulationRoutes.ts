import type { Router } from '@/infra/http/router'
import type { SimulationController } from './SimulationController'

export function registerSimulationRoutes(router: Router, controller: SimulationController): void {
  router.post('/api/simulations', (req, res) => controller.create(req, res))
  router.get('/api/simulations/:id', (req, res) => controller.get(req, res))
}
