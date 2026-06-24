import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'
import type { LogMessageUseCase } from '../../application/use-cases/LogMessageUseCase'
import type { GetConversationHistoryUseCase } from '../../application/use-cases/GetConversationHistoryUseCase'
import type { ListConversationsUseCase } from '../../application/use-cases/ListConversationsUseCase'
import type { ManageTakeoverUseCase } from '../../application/use-cases/ManageTakeoverUseCase'
import type { SendAgentMessageUseCase } from '../../application/use-cases/SendAgentMessageUseCase'
import type { SendAgentMediaUseCase } from '../../application/use-cases/SendAgentMediaUseCase'
import type { WhatsAppSender } from '../WhatsAppSender'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { AppError } from '@/shared/errors/AppError'

const sendSchema = z.object({ text: z.string().min(1) })
const sendTemplateSchema = z.object({ clientName: z.string().optional() })

const sendMediaSchema = z.object({
  base64:   z.string().min(1),
  mimeType: z.string().min(1),
  filename: z.string().min(1),
  caption:  z.string().default(''),
})

const logSchema = z.object({
  direction:   z.enum(['inbound', 'outbound']),
  sender:      z.enum(['customer', 'bot', 'agent']),
  agentUserId: z.string().uuid().optional(),
  type:        z.string().optional(),
  content:     z.string().optional(),
  payload:     z.record(z.unknown()).optional(),
  waMessageId: z.string().optional(),
  status:      z.string().optional(),
})

export class ConversationController {
  constructor(
    private readonly logMessage:     LogMessageUseCase,
    private readonly getHistory:     GetConversationHistoryUseCase,
    private readonly listConvs:      ListConversationsUseCase,
    private readonly takeover:       ManageTakeoverUseCase,
    private readonly sendAgent:      SendAgentMessageUseCase,
    private readonly sendAgentMedia?: SendAgentMediaUseCase,
    private readonly waSender?:      WhatsAppSender,
    private readonly configRepo?:    AppConfigRepository,
  ) {}

  // POST /api/conversations/:whatsapp/takeover  (assume a conversa, pausa o bot)
  async assume(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const userId = request.user?.sub ?? ''
    const result = await this.takeover.takeover(whatsapp, userId)
    response.json(result)
  }

  // POST /api/conversations/:whatsapp/release  (devolve ao bot)
  async release(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const result = await this.takeover.release(whatsapp)
    response.json(result)
  }

  // POST /api/conversations/:whatsapp/finalize  (encerra a conversa)
  async finalize(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const result = await this.takeover.finalize(whatsapp)
    response.json(result)
  }

  // POST /api/conversations/:whatsapp/send  { text }  (atendente → cliente)
  async send(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const userId = request.user?.sub ?? ''
    const { text } = validateBody(sendSchema, request.body)
    const result = await this.sendAgent.execute(whatsapp, text, userId)
    response.json(result, 201)
  }

  // POST /api/conversations/:whatsapp/messages  (interno, token de serviço) — log do n8n
  async log(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const raw = (request.body ?? {}) as Record<string, unknown>
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null))
    const input = validateBody(logSchema, cleaned)
    const result = await this.logMessage.execute({ whatsappNumber: whatsapp, ...input })
    response.json(result, 201)
  }

  // GET /api/conversations/:whatsapp/messages?before=&limit=
  async history(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const before = request.query['before']
    const limit = request.query['limit'] ? Number(request.query['limit']) : 50
    const result = await this.getHistory.execute(whatsapp, before, limit)
    response.json(result)
  }

  // GET /api/conversations?page=&limit=&waitingHuman=true
  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const page = request.query['page'] ? Number(request.query['page']) : 1
    const limit = request.query['limit'] ? Number(request.query['limit']) : 30
    const waitingOnly = request.query['waitingHuman'] === 'true'
    const result = await this.listConvs.execute(page, limit, waitingOnly)
    response.json(result)
  }

  // POST /api/conversations/:whatsapp/read  (zera o contador de não-lidas)
  async read(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    await this.takeover.markRead(whatsapp)
    response.json({ ok: true })
  }

  // POST /api/conversations/:whatsapp/request-human  (interno, n8n) — cliente pediu consultor
  async requestHuman(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    await this.takeover.requestHuman(whatsapp)
    response.json({ ok: true }, 201)
  }

  // GET /api/conversations/:whatsapp/context  (contexto da sessão: seleções do usuário)
  async getContext(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const whatsapp = request.params['whatsapp'] ?? ''
    const context = await this.takeover.getContext(whatsapp)
    response.json(context || {})
  }

  // POST /api/conversations/:whatsapp/send-media  { base64, mimeType, filename, caption }
  async sendMedia(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    if (!this.sendAgentMedia) { response.json({ error: 'Não configurado' }, 501); return }
    const whatsapp = request.params['whatsapp'] ?? ''
    const userId = request.user?.sub ?? ''
    const { base64, mimeType, filename, caption } = validateBody(sendMediaSchema, request.body)
    const result = await this.sendAgentMedia.execute(whatsapp, base64, mimeType, filename, caption ?? '', userId)
    response.json(result, 201)
  }

  // POST /api/conversations/:whatsapp/send-template  (envia template HSM para reabrir janela expirada)
  async sendTemplate(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    if (!this.waSender) { response.json({ error: 'Não configurado' }, 501); return }
    const whatsapp = request.params['whatsapp'] ?? ''
    const userId = request.user?.sub ?? ''
    const { clientName } = validateBody(sendTemplateSchema, request.body ?? {})

    const templateName =
      (await this.configRepo?.getConfig('whatsapp_template_name'))
      ?? process.env.WHATSAPP_TEMPLATE_NAME
    const languageCode =
      (await this.configRepo?.getConfig('whatsapp_template_language'))
      ?? process.env.WHATSAPP_TEMPLATE_LANGUAGE
      ?? 'pt_BR'
    if (!templateName) {
      throw new AppError(
        'Template WhatsApp não configurado. Acesse Configurações > WhatsApp para definir o nome do template.',
        503,
        'WHATSAPP_TEMPLATE_NOT_CONFIGURED',
      )
    }

    const variablesRaw = await this.configRepo?.getConfig('whatsapp_template_variables')
    const variablePatterns: string[] = variablesRaw ? JSON.parse(variablesRaw) : []
    const bodyParameters = variablePatterns.map((pattern) =>
      pattern
        .replace('{clientName}', clientName ?? '')
        .replace('{phone}', whatsapp),
    )

    const { waMessageId } = await this.waSender.sendTemplate(whatsapp, templateName, languageCode, bodyParameters)
    await this.logMessage.execute({
      whatsappNumber: whatsapp,
      direction: 'outbound',
      sender: 'agent',
      agentUserId: userId || undefined,
      type: 'template',
      content: `[Template: ${templateName}]${bodyParameters.length ? ` vars: ${bodyParameters.join(', ')}` : ''}`,
      waMessageId: waMessageId ?? undefined,
      status: 'sent',
    })
    response.json({ ok: true, waMessageId }, 201)
  }

  // GET /api/conversations/media/:mediaId  (proxy de mídia do WhatsApp → base64)
  async mediaProxy(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    if (!this.waSender) { response.json({ error: 'Não configurado' }, 501); return }
    const mediaId = request.params['mediaId'] ?? ''
    const result = await this.waSender.fetchMediaAsBase64(mediaId)
    response.json(result)
  }
}
