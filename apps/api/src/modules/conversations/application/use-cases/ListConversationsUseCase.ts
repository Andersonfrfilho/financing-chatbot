import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'

export class ListConversationsUseCase {
  constructor(private readonly repo: DrizzleConversationRepository) {}

  async execute(page: number, limit: number, waitingOnly = false) {
    const safeLimit = Math.min(Math.max(limit || 30, 1), 100)
    const safePage = Math.max(page || 1, 1)
    const conversations = await this.repo.listConversations(safeLimit, (safePage - 1) * safeLimit, waitingOnly)
    return { conversations, page: safePage, limit: safeLimit }
  }
}
