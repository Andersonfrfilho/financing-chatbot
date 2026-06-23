import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import type { WhatsAppSender } from '../../infra/WhatsAppSender'
import { NotFoundError, ForbiddenError, ValidationError } from '@/shared/errors/AppError'

const TAKEOVER_MSG = '🧑‍💼 Um atendente humano irá dar continuidade ao seu atendimento. Aguarde um momento!'

// Assumir / devolver uma conversa (pausar / religar o bot).
export class ManageTakeoverUseCase {
  constructor(
    private readonly repo: DrizzleConversationRepository,
    private readonly configRepo: AppConfigRepository,
    private readonly sender?: WhatsAppSender,
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
      } catch { /* não bloqueia o takeover se o envio falhar */ }
    }

    return { mode: 'human', assignedUserId: userId }
  }

  async release(whatsapp: string): Promise<{ mode: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    await this.repo.setMode(whatsapp, 'bot', null)
    return { mode: 'bot' }
  }

  async finalize(whatsapp: string): Promise<{ status: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    // Encerra: volta ao bot e limpa o request de human
    await this.repo.setMode(whatsapp, 'bot', null)
    return { status: 'finalized' }
  }

  async markRead(whatsapp: string): Promise<void> {
    await this.repo.markRead(whatsapp)
  }

  // Cliente pediu consultor (handoff) — entra na fila de atendimento.
  async requestHuman(whatsapp: string): Promise<void> {
    await this.repo.requestHuman(whatsapp)
  }

  async getContext(whatsapp: string): Promise<Record<string, unknown> | null> {
    return await this.repo.getContext(whatsapp)
  }
}
