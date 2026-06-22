import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import { NotFoundError, ForbiddenError } from '@/shared/errors/AppError'

// Assumir / devolver uma conversa (pausar / religar o bot).
export class ManageTakeoverUseCase {
  constructor(private readonly repo: DrizzleConversationRepository) {}

  async takeover(whatsapp: string, userId: string): Promise<{ mode: string; assignedUserId: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    if (session.mode === 'human' && session.assignedUserId && session.assignedUserId !== userId) {
      throw new ForbiddenError('Conversa já está sendo atendida por outro usuário')
    }
    await this.repo.setMode(whatsapp, 'human', userId)
    return { mode: 'human', assignedUserId: userId }
  }

  async release(whatsapp: string): Promise<{ mode: string }> {
    const session = await this.repo.getSessionMode(whatsapp)
    if (!session) throw new NotFoundError('Conversa não encontrada')
    await this.repo.setMode(whatsapp, 'bot', null)
    return { mode: 'bot' }
  }

  async markRead(whatsapp: string): Promise<void> {
    await this.repo.markRead(whatsapp)
  }

  // Cliente pediu consultor (handoff) — entra na fila de atendimento.
  async requestHuman(whatsapp: string): Promise<void> {
    await this.repo.requestHuman(whatsapp)
  }
}
