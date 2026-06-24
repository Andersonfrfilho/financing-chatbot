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

const whatsappSchema = z.object({
  whatsapp_template_name:      z.string().max(100),
  whatsapp_template_language:  z.string().max(20).default('pt_BR'),
  whatsapp_template_variables: z.array(z.string().max(500)).default([]),
})

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
    company['simulations_enabled'] = all['simulations_enabled'] ?? 'true'
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

  async getSimulationsEnabled(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const value = await this.configRepo.getConfig('simulations_enabled')
    res.json({ enabled: value !== 'false' }, 200)
  }

  async updateSimulationsEnabled(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const { enabled } = validateBody(z.object({ enabled: z.boolean() }), req.body)
    await this.configRepo.setConfig('simulations_enabled', enabled ? 'true' : 'false')
    res.json({ ok: true, enabled }, 200)
  }

  async getWhatsAppSettings(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const all = await this.configRepo.getAllConfigs()
    const rawVariables = all['whatsapp_template_variables']
    res.json({
      whatsapp_template_name:      all['whatsapp_template_name'] ?? process.env.WHATSAPP_TEMPLATE_NAME ?? '',
      whatsapp_template_language:  all['whatsapp_template_language'] ?? process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'pt_BR',
      whatsapp_template_variables: rawVariables ? JSON.parse(rawVariables) : [],
    }, 200)
  }

  async updateWhatsAppSettings(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(whatsappSchema, req.body)
    await this.configRepo.setConfig('whatsapp_template_name', input.whatsapp_template_name)
    await this.configRepo.setConfig('whatsapp_template_language', input.whatsapp_template_language ?? 'pt_BR')
    await this.configRepo.setConfig('whatsapp_template_variables', JSON.stringify(input.whatsapp_template_variables ?? []))
    res.json({ ok: true }, 200)
  }
}
