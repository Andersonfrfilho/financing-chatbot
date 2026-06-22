import type { DrizzleConversationRepository, LogMessageInput } from '../../infra/repositories/DrizzleConversationRepository'

// Persiste uma mensagem do transcript. Ponto único onde, na Fase C, faremos o fan-out p/ SSE.
export class LogMessageUseCase {
  constructor(private readonly repo: DrizzleConversationRepository) {}

  async execute(input: LogMessageInput): Promise<{ id: string | null; deduped: boolean }> {
    const row = await this.repo.insertMessage(input)
    // TODO (Fase C): emitir evento SSE p/ os streams abertos desta conversa (whatsappNumber).
    return { id: row?.id ?? null, deduped: row === null }
  }
}
