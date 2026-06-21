import type { Router } from '@/infra/http/router'
import type { AuthController } from './AuthController'

export function registerAuthRoutes(router: Router, controller: AuthController): void {
  router.post('/api/auth/login', (req, res) => controller.login(req, res))
  router.post('/api/auth/refresh', (req, res) => controller.refresh(req, res))
  router.post('/api/auth/logout', (req, res) => controller.logout(req, res))
}
