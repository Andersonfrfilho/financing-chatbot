import { eq, ilike, desc, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { financingSimulations, simulationResults, banks } from '@/infra/database/schema'
import type { SimulationRepository, SimulationFilters, SimulationListItem } from '../../domain/repositories/SimulationRepository'

export class DrizzleSimulationRepository implements SimulationRepository {
  async findAll(filters: SimulationFilters): Promise<{ data: SimulationListItem[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.search) {
      conditions.push(ilike(financingSimulations.whatsappNumber, `%${filters.search}%`))
    }
    if (filters.financingType) {
      conditions.push(eq(financingSimulations.financingType, filters.financingType as any))
    }
    if (filters.startDate) {
      conditions.push(gte(financingSimulations.createdAt, new Date(filters.startDate)))
    }
    if (filters.endDate) {
      conditions.push(lte(financingSimulations.createdAt, new Date(filters.endDate)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const bankAgg = db
      .select({
        simulationId: simulationResults.simulationId,
        names: sql<string>`string_agg(DISTINCT ${banks.name}, ', ' ORDER BY ${banks.name})`,
      })
      .from(simulationResults)
      .innerJoin(banks, eq(simulationResults.bankId, banks.id))
      .groupBy(simulationResults.simulationId)
      .as('bankAgg')

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: financingSimulations.id,
          financingType: financingSimulations.financingType,
          requestedAmount: sql<string>`${financingSimulations.requestedAmount}::text`,
          termMonths: financingSimulations.termMonths,
          createdAt: financingSimulations.createdAt,
          bankNames: bankAgg.names,
        })
        .from(financingSimulations)
        .leftJoin(bankAgg, eq(financingSimulations.id, bankAgg.simulationId))
        .where(where)
        .orderBy(desc(financingSimulations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(financingSimulations)
        .where(where),
    ])

    return { data: data as unknown as SimulationListItem[], total: Number(countResult[0].count) }
  }
}
