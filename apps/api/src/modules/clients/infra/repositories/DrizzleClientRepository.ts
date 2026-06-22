import { eq, ilike, and, isNull, sql, desc } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { financingClients } from '@/infra/database/schema'
import type { FinancingClient } from '@/infra/database/schema'
import type { ClientRepository, CreateClientInput, UpdateClientInput, ClientFilters } from '../../domain/repositories/ClientRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleClientRepository implements ClientRepository {
  async findById(id: string): Promise<FinancingClient | null> {
    const result = await db
      .select()
      .from(financingClients)
      .where(and(eq(financingClients.id, id), isNull(financingClients.deletedAt)))
      .limit(1)
    return result[0] ?? null
  }

  async findByWhatsappNumber(whatsappNumber: string): Promise<FinancingClient | null> {
    const result = await db
      .select()
      .from(financingClients)
      .where(and(eq(financingClients.whatsappNumber, whatsappNumber), isNull(financingClients.deletedAt)))
      .limit(1)
    return result[0] ?? null
  }

  async findByCpf(cpf: string): Promise<FinancingClient | null> {
    const result = await db
      .select()
      .from(financingClients)
      .where(and(eq(financingClients.cpfEncrypted, cpf), isNull(financingClients.deletedAt)))
      .limit(1)
    return result[0] ?? null
  }

  async reassignWhatsapp(cpf: string, newWhatsapp: string): Promise<boolean> {
    try {
      await db
        .update(financingClients)
        .set({ whatsappNumber: newWhatsapp, updatedAt: new Date() })
        .where(eq(financingClients.cpfEncrypted, cpf))
      return true
    } catch {
      // viola unique: o novo número já pertence a outro cadastro — mantém o número antigo
      return false
    }
  }

  async findAll(filters: ClientFilters): Promise<{ data: FinancingClient[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [isNull(financingClients.deletedAt)]
    if (filters.search) conditions.push(ilike(financingClients.name, `%${filters.search}%`))
    if (filters.city) conditions.push(ilike(financingClients.city, `%${filters.city}%`))
    if (filters.state) conditions.push(eq(financingClients.state, filters.state))

    const where = and(...conditions)

    const [data, countResult] = await Promise.all([
      db.select().from(financingClients).where(where).orderBy(desc(financingClients.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(financingClients).where(where),
    ])

    return { data, total: Number(countResult[0].count) }
  }

  async upsert(input: CreateClientInput): Promise<FinancingClient> {
    const { whatsappNumber, ...updateFields } = input
    const result = await db
      .insert(financingClients)
      .values(input)
      .onConflictDoUpdate({
        target: financingClients.whatsappNumber,
        set: { ...updateFields, updatedAt: new Date() },
      })
      .returning()
    return result[0]
  }

  async update(id: string, input: UpdateClientInput): Promise<FinancingClient> {
    const result = await db
      .update(financingClients)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(financingClients.id, id), isNull(financingClients.deletedAt)))
      .returning()
    if (!result[0]) throw new NotFoundError('Cliente não encontrado')
    return result[0]
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(financingClients)
      .set({ deletedAt: new Date() })
      .where(eq(financingClients.id, id))
  }
}
