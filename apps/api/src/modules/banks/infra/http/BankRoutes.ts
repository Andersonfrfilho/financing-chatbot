import type { Router } from '@/infra/http/router'
import type { BankController } from './BankController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerBankRoutes(router: Router, controller: BankController) {
  router.get('/api/banks', authenticate, (res, req) => controller.list(res, req))
  router.get('/api/banks/:id/rates', authenticate, authorize(['banks:read']), (res, req) => controller.getRates(res, req))
  router.post('/api/banks/:id/rates', authenticate, authorize(['banks:write']), (res, req, body) => controller.createRate(res, req, body))
}
