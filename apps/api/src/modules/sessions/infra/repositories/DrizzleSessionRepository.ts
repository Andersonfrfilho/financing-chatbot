import { eq, desc, and, or, gte, lte, ilike, inArray, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { conversationSessions, financingClients } from '@/infra/database/schema'
import type { ConversationSession } from '@/infra/database/schema'

export type SessionFilters = {
  search?: string
  states?: string[]
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export type SessionRow = ConversationSession & { clientName: string | null }

export class DrizzleSessionRepository {
  async findByWhatsappNumber(whatsappNumber: string): Promise<ConversationSession | null> {
    const result = await db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
      .limit(1)
    return result[0] ?? null
  }

  async findAll(filters: SessionFilters): Promise<{ data: SessionRow[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(or(
        ilike(conversationSessions.whatsappNumber, term),
        ilike(financingClients.name, term),
        ilike(financingClients.companyName, term),
      ))
    }
    if (filters.states && filters.states.length > 0) conditions.push(inArray(conversationSessions.currentState, filters.states as any))
    if (filters.startDate) conditions.push(gte(conversationSessions.lastActivity, new Date(filters.startDate)))
    if (filters.endDate) conditions.push(lte(conversationSessions.lastActivity, new Date(filters.endDate)))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const baseQuery = db
      .select({
        id:              conversationSessions.id,
        whatsappNumber:  conversationSessions.whatsappNumber,
        currentState:    conversationSessions.currentState,
        context:         conversationSessions.context,
        mode:            conversationSessions.mode,
        assignedUserId:  conversationSessions.assignedUserId,
        humanRequestedAt: conversationSessions.humanRequestedAt,
        lastInboundAt:   conversationSessions.lastInboundAt,
        lastAgentReadAt: conversationSessions.lastAgentReadAt,
        lastActivity:    conversationSessions.lastActivity,
        createdAt:       conversationSessions.createdAt,
        updatedAt:       conversationSessions.updatedAt,
        clientName:      sql<string | null>`COALESCE(${financingClients.name}, ${financingClients.companyName})`,
      })
      .from(conversationSessions)
      .leftJoin(financingClients, and(
        eq(conversationSessions.whatsappNumber, financingClients.whatsappNumber),
        sql`${financingClients.deletedAt} IS NULL`,
      ))
      .where(where)

    const [data, countResult] = await Promise.all([
      baseQuery.orderBy(desc(conversationSessions.lastActivity)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(conversationSessions)
        .leftJoin(financingClients, and(
          eq(conversationSessions.whatsappNumber, financingClients.whatsappNumber),
          sql`${financingClients.deletedAt} IS NULL`,
        ))
        .where(where),
    ])

    return { data: data as SessionRow[], total: Number(countResult[0].count) }
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
