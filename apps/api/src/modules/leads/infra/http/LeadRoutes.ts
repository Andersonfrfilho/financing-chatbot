import type { Router } from '@/infra/http/router'
import type { LeadController } from './LeadController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerLeadRoutes(router: Router, controller: LeadController) {
  router.get('/api/leads', authenticate, authorize(['leads:read']), (res, req) => controller.list(res, req))
  router.get('/api/leads/:id', authenticate, authorize(['leads:read']), (res, req) => controller.get(res, req))
  router.patch('/api/leads/:id', authenticate, authorize(['leads:write']), (res, req, body) => controller.update(res, req, body))
}
