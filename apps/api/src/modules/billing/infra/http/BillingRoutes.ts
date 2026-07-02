import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { requireInternalToken } from '@/infra/http/middlewares/requireInternalToken'
import type { BillingController } from './BillingController'

export function registerBillingRoutes(router: Router, controller: BillingController): void {
  router.get('/api/billing/status', authenticate, (req, res) => controller.getStatus(req, res))
  router.put('/api/billing/payment', authenticate, requireInternalToken, (req, res) => controller.updatePayment(req, res))
}
