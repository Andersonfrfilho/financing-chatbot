import type { Router } from '@/infra/http/router'
import type { BankController } from './BankController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerBankRoutes(router: Router, controller: BankController) {
  router.get('/api/banks',           authenticate,                            (req, res) => controller.list(req, res))
  router.get('/api/banks/:id/rates', authenticate, authorize(['banks:read']), (req, res) => controller.getRates(req, res))
  router.post('/api/banks/:id/rates',authenticate, authorize(['banks:write']),(req, res) => controller.createRate(req, res))
}
