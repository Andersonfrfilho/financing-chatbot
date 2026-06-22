import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { SettingsController } from './SettingsController'

export function registerSettingsRoutes(router: Router, controller: SettingsController): void {
  router.get('/api/settings/max-agent-sessions', authenticate, (req, res) => controller.getMaxAgentSessions(req, res))
  router.post('/api/settings/max-agent-sessions', authenticate, (req, res) => controller.updateMaxAgentSessions(req, res))
  router.get('/api/settings/state-labels', (_req, res) => controller.getStateLabels(_req, res))
}
