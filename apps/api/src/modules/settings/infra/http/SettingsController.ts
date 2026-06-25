import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'
import type { UpdateMaxAgentSessionsUseCase } from '../../application/use-cases/UpdateMaxAgentSessionsUseCase'
import type { AppConfigRepository } from '../../infra/repositories/AppConfigRepository'
import { AppError } from '@/shared/errors/AppError'
import { STATE_LABELS } from './StateLabelsRepository'
import { VALUE_LABELS } from './ValueLabelsRepository'

const GRAPH = 'https://graph.facebook.com'

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

const createTemplateSchema = z.object({
  name:       z.string().min(3).max(100),
  category:   z.enum(['MARKETING', 'UTILITY']),
  language:   z.string().min(2).max(10).default('pt_BR'),
  headerType: z.enum(['NONE', 'TEXT']).default('NONE'),
  headerText: z.string().max(60).optional(),
  bodyText:   z.string().min(1).max(1024),
  footerText: z.string().max(60).optional(),
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

  async listWhatsAppTemplates(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    const token  = process.env.WHATSAPP_ACCESS_TOKEN
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    if (!wabaId || !token) {
      throw new AppError(
        'WHATSAPP_BUSINESS_ACCOUNT_ID ou WHATSAPP_ACCESS_TOKEN não configurados.',
        503,
        'WHATSAPP_CONFIG_MISSING',
      )
    }

    const url = `${GRAPH}/${version}/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100&access_token=${token}`
    let resp: Response
    try {
      resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    } catch {
      throw new AppError('Falha de rede ao consultar templates WhatsApp.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new AppError(`Erro ao listar templates (${resp.status}): ${text.slice(0, 200)}`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const data = (await resp.json()) as { data: Array<{
      id: string
      name: string
      status: string
      category: string
      language: string
      components: Array<{ type: string; text?: string; format?: string }>
    }> }

    const templates = data.data
      .map((template) => {
        const body = template.components.find((component) => component.type === 'BODY')
        const variableCount = (body?.text?.match(/\{\{(\d+)\}\}/g) ?? []).length
        const shortId = template.id ? template.id.slice(-8) : template.name.slice(0, 8)
        const displayName = template.name.replace(/_/g, ' ')
        return {
          id:            template.id,
          name:          template.name,
          shortId,
          displayName,
          status:        template.status,
          category:      template.category,
          language:      template.language,
          bodyText:      body?.text ?? null,
          variableCount,
        }
      })

    res.json({ templates }, 200)
  }

  async createWhatsAppTemplate(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(createTemplateSchema, req.body)

    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    const token  = process.env.WHATSAPP_ACCESS_TOKEN
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'

    if (!wabaId || !token) {
      throw new AppError('WHATSAPP_BUSINESS_ACCOUNT_ID ou WHATSAPP_ACCESS_TOKEN não configurados.', 503, 'WHATSAPP_CONFIG_MISSING')
    }

    const url = `${GRAPH}/${version}/${wabaId}/message_templates`

    const components: Array<{ type: string; text?: string }> = []
    if (input.headerType === 'TEXT' && input.headerText) {
      components.push({ type: 'HEADER', text: input.headerText })
    }
    components.push({ type: 'BODY', text: input.bodyText })
    if (input.footerText) {
      components.push({ type: 'FOOTER', text: input.footerText })
    }

    const body = JSON.stringify({
      name: input.name,
      category: input.category,
      language: input.language,
      components,
    })

    let resp: globalThis.Response
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new AppError('Falha de rede ao criar template no WhatsApp.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      const status = resp.status
      if (status === 400 && text.includes('duplicate')) {
        throw new AppError('Já existe um template com este nome no WhatsApp.', 409, 'WHATSAPP_TEMPLATE_DUPLICATE')
      }
      throw new AppError(`WhatsApp recusou a criação do template (${status}): ${text.slice(0, 300)}`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const data = await resp.json().catch(() => ({})) as { id?: string; name?: string; status?: string }
    const shortId = data.id ? data.id.slice(-8) : ''
    res.json({ ok: true, id: data.id, shortId, status: data.status ?? 'PENDING', message: 'Template enviado para aprovação do WhatsApp.' }, 201)
  }
}
