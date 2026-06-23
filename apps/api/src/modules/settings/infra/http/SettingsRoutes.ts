import type { Router } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import type { SettingsController } from './SettingsController'

export function registerSettingsRoutes(router: Router, controller: SettingsController): void {
  // Max sessions
  router.get('/api/settings/max-agent-sessions', authenticate, (req, res) => controller.getMaxAgentSessions(req, res))
  router.post('/api/settings/max-agent-sessions', authenticate, (req, res) => controller.updateMaxAgentSessions(req, res))

  // Labels (public — login page + bot panel need them)
  router.get('/api/settings/state-labels', (_req, res) => controller.getStateLabels(_req, res))
  router.get('/api/settings/value-labels',  (_req, res) => controller.getValueLabels(_req, res))

  // Company settings (public GET — login page shows logo/name without auth)
  router.get('/api/settings/company',  (_req, res) => controller.getCompanySettings(_req, res))
  router.put('/api/settings/company',  authenticate, (req, res) => controller.updateCompanySettings(req, res))

  // Email reset flag (admin only)
  router.put('/api/settings/email-reset-enabled', authenticate, (req, res) => controller.updateEmailResetEnabled(req, res))
}
