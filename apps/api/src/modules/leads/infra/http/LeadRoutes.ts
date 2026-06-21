import type { Router } from '@/infra/http/router'
import type { LeadController } from './LeadController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerLeadRoutes(router: Router, controller: LeadController) {
  router.get('/api/leads',       authenticate, authorize(['leads:read']),  (req, res) => controller.list(req, res))
  router.get('/api/leads/:id',   authenticate, authorize(['leads:read']),  (req, res) => controller.get(req, res))
  router.patch('/api/leads/:id', authenticate, authorize(['leads:write']), (req, res) => controller.update(req, res))
}
