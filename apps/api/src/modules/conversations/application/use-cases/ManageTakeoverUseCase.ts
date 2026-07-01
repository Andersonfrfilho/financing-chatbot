import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import type { WhatsAppSender } from '../../infra/WhatsAppSender'
import type { SseHub } from '@/infra/sse/SseHub'
import { NotFoundError, ForbiddenError, ValidationError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'

const TAKEOVER_MSG = '🧑‍💼 Um atendente humano irá dar continuidade ao seu atendimento. Aguarde um momento!'

// Assumir / devolver uma conversa (pausar / religar o bot).
export class ManageTakeoverUseCase {
  constructor(
    private readonly repo: DrizzleConversationRepository,
    private readonly configRepo: AppConfigRepository,
    private readonly sender?: WhatsAppSender,
    private readonly sse?: SseHub,
  ) {}

  async takeover(whatsapp: string, userId: string): Promise<{ mode: string; assignedUserId: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    if (session.mode === 'human' && session.assignedUserId && session.assignedUserId !== userId) {
      throw new ForbiddenError('Conversa já está sendo atendida por outro usuário')
    }

    // Verifica se já é o atendente (não conta como nova sessão)
    if (session.assignedUserId === userId) {
      return { mode: 'human', assignedUserId: userId }
    }

    // Verifica limite de sessões ativas
    const activeSessions = await this.repo.countActiveSessionsForAgent(userId)
    const maxSessions = await this.configRepo.getConfigAsNumber('max_agent_sessions', 10)
    if (activeSessions >= maxSessions) {
      throw new ValidationError(`Limite de ${maxSessions} conversas simultâneas atingido. Encerre algumas antes de assumir novas.`)
    }

    await this.repo.setMode(whatsapp, 'human', userId)
    this.sse?.emit(`conv:${whatsapp}`, 'session', { mode: 'human', assignedUserId: userId })
    this.sse?.emit('global', 'data-changed', {})

    // Notifica o cliente que um atendente assumiu
    if (this.sender) {
      try {
        const { waMessageId } = await this.sender.sendText(whatsapp, TAKEOVER_MSG)
        await this.repo.insertMessage({
          whatsappNumber: whatsapp,
          direction: 'outbound',
          sender: 'agent',
          agentUserId: userId,
          type: 'text',
          content: TAKEOVER_MSG,
          waMessageId,
          status: 'sent',
        })
      } catch (error) {
        logger.child('ManageTakeoverUseCase.takeover').error(LOG_EVENTS.TAKEOVER, {
          whatsapp, reason: 'Falha ao enviar mensagem de takeover',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { mode: 'human', assignedUserId: userId }
  }

  async release(whatsapp: string): Promise<{ mode: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    await this.repo.setMode(whatsapp, 'bot', null)
    this.sse?.emit(`conv:${whatsapp}`, 'session', { mode: 'bot' })
    this.sse?.emit('global', 'data-changed', {})
    return { mode: 'bot' }
  }

  async finalize(whatsapp: string): Promise<{ status: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    await this.repo.setMode(whatsapp, 'bot', null)
    this.sse?.emit(`conv:${whatsapp}`, 'session', { mode: 'bot' })
    this.sse?.emit('global', 'data-changed', {})
    return { status: 'finalized' }
  }

  async markRead(whatsapp: string): Promise<void> {
    await this.repo.markRead(whatsapp)
  }

  async markAllRead(): Promise<void> {
    await this.repo.markAllRead()
  }

  // Cliente pediu consultor (handoff) — entra na fila de atendimento.
  async requestHuman(whatsapp: string): Promise<void> {
    await this.repo.requestHuman(whatsapp)
  }

  async getContext(whatsapp: string): Promise<Record<string, unknown> | null> {
    return await this.repo.getContext(whatsapp)
  }
}
