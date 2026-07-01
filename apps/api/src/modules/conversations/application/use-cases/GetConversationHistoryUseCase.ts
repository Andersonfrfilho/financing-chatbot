import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'

export class GetConversationHistoryUseCase {
  constructor(private readonly repository: DrizzleConversationRepository) {}

  async execute(whatsappNumber: string, before: string | undefined, limit: number) {
    const cursor = before ? new Date(before) : null
    const safeCursor = cursor && !isNaN(cursor.getTime()) ? cursor : null
    const safeLimit = Math.min(Math.max(limit || 50, 1), 100)
    const messages = await this.repository.listMessages(whatsappNumber, safeCursor, safeLimit)
    const nextCursor = messages.length === safeLimit ? messages[0]?.createdAt ?? null : null
    return { messages, nextCursor }
  }
}
