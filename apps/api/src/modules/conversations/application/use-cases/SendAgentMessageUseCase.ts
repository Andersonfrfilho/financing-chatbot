import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import type { WhatsAppSender } from '../../infra/WhatsAppSender'
import type { SseHub } from '@/infra/sse/SseHub'
import { ValidationError } from '@/shared/errors/AppError'

// Atendente envia uma mensagem ao cliente: dispara no WhatsApp (Graph) e registra no transcript.
export class SendAgentMessageUseCase {
  constructor(
    private readonly repository: DrizzleConversationRepository,
    private readonly sender: WhatsAppSender,
    private readonly sse?: SseHub,
  ) {}

  async execute(whatsapp: string, text: string, agentUserId: string) {
    const body = (text ?? '').trim()
    if (!body) throw new ValidationError('Mensagem vazia')

    // Garante modo humano: enviar pelo painel assume a conversa se ainda não assumida.
    const session = await this.repository.getSessionMode(whatsapp)
    if (session && session.mode !== 'human') {
      await this.repository.setMode(whatsapp, 'human', agentUserId)
    }

    const { waMessageId } = await this.sender.sendText(whatsapp, body)
    const row = await this.repository.insertMessage({
      whatsappNumber: whatsapp,
      direction: 'outbound',
      sender: 'agent',
      agentUserId,
      type: 'text',
      content: body,
      waMessageId,
      status: 'sent',
    })
    if (row && this.sse) {
      this.sse.emit(`conv:${whatsapp}`, 'message', { id: row.id, direction: 'outbound', sender: 'agent' })
    }
    return { id: row?.id ?? null, waMessageId }
  }
}
