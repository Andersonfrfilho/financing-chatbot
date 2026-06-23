import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'
import type { UpdateMaxAgentSessionsUseCase } from '../../application/use-cases/UpdateMaxAgentSessionsUseCase'
import type { AppConfigRepository } from '../../infra/repositories/AppConfigRepository'
import { STATE_LABELS } from './StateLabelsRepository'
import { VALUE_LABELS } from './ValueLabelsRepository'

const updateMaxSessionsSchema = z.object({
  maxSessions: z.number().int().min(1).max(100),
})

const companySchema = z.object({
  company_name:     z.string().max(100).optional(),
  company_logo_url: z.string().url().max(500).or(z.literal('')).optional(),
  company_email:    z.string().email().max(255).or(z.literal('')).optional(),
  company_phone:    z.string().max(30).optional(),
})

const COMPANY_KEYS = ['company_name', 'company_logo_url', 'company_email', 'company_phone'] as const

export class SettingsController {
  constructor(
    private readonly updateMaxAgentSessionsUseCase: UpdateMaxAgentSessionsUseCase,
    private readonly configRepo: AppConfigRepository,
  ) {}

  async getMaxAgentSessions(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const maxSessions = await this.updateMaxAgentSessionsUseCase.getMaxSessions()
    res.json({ maxSessions }, 200)
  }

  async updateMaxAgentSessions(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(updateMaxSessionsSchema, req.body)
    const result = await this.updateMaxAgentSessionsUseCase.execute(input.maxSessions)
    res.json(result, 200)
  }

  async getStateLabels(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    res.json(STATE_LABELS, 200)
  }

  async getValueLabels(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    res.json(VALUE_LABELS, 200)
  }

  async getCompanySettings(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const all = await this.configRepo.getAllConfigs()
    const company: Record<string, string> = {}
    for (const key of COMPANY_KEYS) company[key] = all[key] ?? ''
    company['email_reset_enabled'] = all['email_reset_enabled'] ?? 'false'
    res.json(company, 200)
  }

  async updateCompanySettings(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(companySchema, req.body)
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) await this.configRepo.setConfig(key, value)
    }
    res.json({ ok: true }, 200)
  }

  async updateEmailResetEnabled(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const { enabled } = validateBody(z.object({ enabled: z.boolean() }), req.body)
    await this.configRepo.setConfig('email_reset_enabled', enabled ? 'true' : 'false')
    res.json({ ok: true, enabled }, 200)
  }
}
