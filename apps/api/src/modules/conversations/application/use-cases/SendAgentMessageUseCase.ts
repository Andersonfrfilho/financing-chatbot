import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import type { WhatsAppSender } from '../../infra/WhatsAppSender'
import { ValidationError } from '@/shared/errors/AppError'

// Atendente envia uma mensagem ao cliente: dispara no WhatsApp (Graph) e registra no transcript.
export class SendAgentMessageUseCase {
  constructor(
    private readonly repo: DrizzleConversationRepository,
    private readonly sender: WhatsAppSender,
  ) {}

  async execute(whatsapp: string, text: string, agentUserId: string) {
    const body = (text ?? '').trim()
    if (!body) throw new ValidationError('Mensagem vazia')

    // Garante modo humano: enviar pelo painel assume a conversa se ainda não assumida.
    const session = await this.repo.getSessionMode(whatsapp)
    if (session && session.mode !== 'human') {
      await this.repo.setMode(whatsapp, 'human', agentUserId)
    }

    const { waMessageId } = await this.sender.sendText(whatsapp, body)
    const row = await this.repo.insertMessage({
      whatsappNumber: whatsapp,
      direction: 'outbound',
      sender: 'agent',
      agentUserId,
      type: 'text',
      content: body,
      waMessageId,
      status: 'sent',
    })
    // TODO (Fase C): emitir SSE para os streams abertos desta conversa.
    return { id: row?.id ?? null, waMessageId }
  }
}
