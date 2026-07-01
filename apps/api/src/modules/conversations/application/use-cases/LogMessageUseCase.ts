import type { DrizzleConversationRepository, LogMessageInput } from '../../infra/repositories/DrizzleConversationRepository'
import type { SseHub } from '@/infra/sse/SseHub'

// Persiste uma mensagem do transcript e notifica os streams SSE abertos da conversa (Fase C).
export class LogMessageUseCase {
  constructor(
    private readonly repository: DrizzleConversationRepository,
    private readonly sse?: SseHub,
  ) {}

  async execute(input: LogMessageInput): Promise<{ id: string | null; deduped: boolean }> {
    const row = await this.repository.insertMessage(input)
    if (this.sse) {
      if (row) {
        this.sse.emit(`conv:${input.whatsappNumber}`, 'message', { id: row.id, direction: input.direction, sender: input.sender })
      }
      // Emitir evento de leitura quando status='read' (readAt foi atualizado no banco)
      if (input.status === 'read' && input.waMessageId) {
        this.sse.emit(`conv:${input.whatsappNumber}`, 'message-read', { waMessageId: input.waMessageId })
      }
    }
    return { id: row?.id ?? null, deduped: row === null }
  }
}
