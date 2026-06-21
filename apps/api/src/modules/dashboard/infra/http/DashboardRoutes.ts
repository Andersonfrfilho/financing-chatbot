import type { Router } from '@/infra/http/router'
import type { DashboardController } from './DashboardController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerDashboardRoutes(router: Router, controller: DashboardController) {
  router.get('/api/dashboard/stats',      authenticate, authorize(['dashboard:read']), (req, res) => controller.stats(req, res))
  router.get('/api/dashboard/commercial', authenticate, authorize(['dashboard:read']), (req, res) => controller.commercial(req, res))
}
