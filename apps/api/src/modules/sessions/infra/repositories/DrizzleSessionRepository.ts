import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { conversationSessions } from '@/infra/database/schema'
import type { ConversationSession } from '@/infra/database/schema'

export type SessionFilters = {
  state?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export class DrizzleSessionRepository {
  async findByWhatsappNumber(whatsappNumber: string): Promise<ConversationSession | null> {
    const result = await db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
      .limit(1)
    return result[0] ?? null
  }

  async findAll(filters: SessionFilters): Promise<{ data: ConversationSession[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.state) conditions.push(eq(conversationSessions.currentState, filters.state as any))
    if (filters.startDate) conditions.push(gte(conversationSessions.lastActivity, new Date(filters.startDate)))
    if (filters.endDate) conditions.push(lte(conversationSessions.lastActivity, new Date(filters.endDate)))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, countResult] = await Promise.all([
      db.select().from(conversationSessions).where(where).orderBy(desc(conversationSessions.lastActivity)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(conversationSessions).where(where),
    ])

    return { data, total: Number(countResult[0].count) }
  }

  async countByState(): Promise<Record<string, number>> {
    const result = await db
      .select({ state: conversationSessions.currentState, count: sql<number>`count(*)` })
      .from(conversationSessions)
      .groupBy(conversationSessions.currentState)

    return Object.fromEntries(result.map((r) => [r.state, Number(r.count)]))
  }

  async upsert(whatsappNumber: string, currentState: string, context: Record<string, unknown>): Promise<void> {
    await db
      .insert(conversationSessions)
      .values({ whatsappNumber, currentState: currentState as any, context })
      .onConflictDoUpdate({
        target: conversationSessions.whatsappNumber,
        set: { currentState: currentState as any, context, lastActivity: new Date() },
      })
  }

  async delete(whatsappNumber: string): Promise<void> {
    await db.delete(conversationSessions).where(eq(conversationSessions.whatsappNumber, whatsappNumber))
  }
}
