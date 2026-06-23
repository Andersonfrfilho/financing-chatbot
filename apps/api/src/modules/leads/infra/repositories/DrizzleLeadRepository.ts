import { eq, ilike, and, or, sql, desc, gte, lte } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { leads, financingClients, financingSimulations, conversationSessions } from '@/infra/database/schema'
import type { Lead } from '@/infra/database/schema'
import type { LeadRepository, CreateLeadInput, UpdateLeadInput, LeadFilters } from '../../domain/repositories/LeadRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleLeadRepository implements LeadRepository {
  async findById(id: string): Promise<Lead | null> {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
    return result[0] ?? null
  }

  async findAll(filters: LeadFilters): Promise<{ data: any[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.status) conditions.push(eq(leads.status, filters.status as any))
    if (filters.assignedTo) conditions.push(eq(leads.assignedTo, filters.assignedTo))
    if (filters.startDate) conditions.push(gte(leads.createdAt, new Date(filters.startDate)))
    if (filters.endDate) conditions.push(lte(leads.createdAt, new Date(filters.endDate)))
    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(or(ilike(leads.whatsappNumber, term), ilike(financingClients.name, term)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const baseQuery = db
      .select({
        id:               leads.id,
        clientId:         leads.clientId,
        simulationId:     leads.simulationId,
        whatsappNumber:   leads.whatsappNumber,
        status:           leads.status,
        assignedTo:       leads.assignedTo,
        notes:            leads.notes,
        createdAt:        leads.createdAt,
        updatedAt:        leads.updatedAt,
        clientName:       financingClients.name,
        financingType:    financingSimulations.financingType,
        requestedProduct: sql<string>`${conversationSessions.context}->>'requestedProduct'`,
      })
      .from(leads)
      .leftJoin(financingClients, eq(leads.clientId, financingClients.id))
      .leftJoin(financingSimulations, eq(leads.simulationId, financingSimulations.id))
      .leftJoin(conversationSessions, eq(leads.whatsappNumber, conversationSessions.whatsappNumber))

    const [data, countResult] = await Promise.all([
      baseQuery.where(where).orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .leftJoin(financingClients, eq(leads.clientId, financingClients.id))
        .leftJoin(conversationSessions, eq(leads.whatsappNumber, conversationSessions.whatsappNumber))
        .where(where),
    ])

    return { data, total: Number(countResult[0].count) }
  }

  async findByClientId(clientId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.clientId, clientId)).orderBy(desc(leads.createdAt))
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const result = await db.insert(leads).values(input).returning()
    return result[0]
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    const result = await db
      .update(leads)
      .set({
        ...(input.status     && { status:     input.status     as Lead['status'] }),
        ...(input.assignedTo && { assignedTo: input.assignedTo }),
        ...(input.notes      && { notes:      input.notes }),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning()
    if (!result[0]) throw new NotFoundError('Lead não encontrado')
    return result[0]
  }

  async countByStatus(): Promise<Record<string, number>> {
    const result = await db
      .select({ status: leads.status, count: sql<number>`count(*)` })
      .from(leads)
      .groupBy(leads.status)
    return Object.fromEntries(result.map((r) => [r.status, Number(r.count)]))
  }
}
