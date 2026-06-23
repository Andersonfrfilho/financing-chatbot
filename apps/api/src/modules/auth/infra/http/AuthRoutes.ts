import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { AuthController } from './AuthController'

export function registerAuthRoutes(router: Router, controller: AuthController): void {
  router.post('/api/auth/login',           (req, res) => controller.login(req, res))
  router.post('/api/auth/refresh',         (req, res) => controller.refresh(req, res))
  router.post('/api/auth/logout',          authenticate, (req, res) => controller.logout(req, res))
  router.post('/api/auth/forgot-password', (req, res) => controller.forgotPassword(req, res))
  router.post('/api/auth/reset-password',  (req, res) => controller.resetPassword(req, res))
}
