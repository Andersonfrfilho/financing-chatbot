import type { DrizzleConversationRepository, LogMessageInput } from '../../infra/repositories/DrizzleConversationRepository'
import type { SseHub } from '@/infra/sse/SseHub'

// Persiste uma mensagem do transcript e notifica os streams SSE abertos da conversa (Fase C).
export class LogMessageUseCase {
  constructor(
    private readonly repo: DrizzleConversationRepository,
    private readonly sse?: SseHub,
  ) {}

  async execute(input: LogMessageInput): Promise<{ id: string | null; deduped: boolean }> {
    const row = await this.repo.insertMessage(input)
    if (row && this.sse) {
      this.sse.emit(`conv:${input.whatsappNumber}`, 'message', { id: row.id, direction: input.direction, sender: input.sender })
    }
    return { id: row?.id ?? null, deduped: row === null }
  }
}
