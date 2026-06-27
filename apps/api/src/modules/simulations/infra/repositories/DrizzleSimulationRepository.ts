import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { financingSimulations, simulationResults, banks, financingClients } from '@/infra/database/schema'
import type { SimulationRepository, SimulationFilters, SimulationListItem } from '../../domain/repositories/SimulationRepository'

export class DrizzleSimulationRepository implements SimulationRepository {
  async findAll(filters: SimulationFilters): Promise<{ data: SimulationListItem[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(sql`(${financingSimulations.whatsappNumber} ILIKE ${term} OR ${financingClients.name} ILIKE ${term})`)
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
        names:        sql<string>`string_agg(DISTINCT ${banks.name}, ', ')`,
        bestRate:     sql<number>`min(${simulationResults.firstInstallment}::numeric)`,
        count:        sql<number>`count(DISTINCT ${simulationResults.bankId})`,
      })
      .from(simulationResults)
      .innerJoin(banks, eq(simulationResults.bankId, banks.id))
      .groupBy(simulationResults.simulationId)
      .as('bankAgg')

    const [data, countResult] = await Promise.all([
      db
        .select({
          id:                financingSimulations.id,
          financingType:     financingSimulations.financingType,
          requestedAmount:   sql<string>`${financingSimulations.requestedAmount}::text`,
          financedAmount:    sql<string>`${financingSimulations.financedAmount}::text`,
          downPaymentAmount: sql<string>`${financingSimulations.downPaymentAmount}::text`,
          termMonths:        financingSimulations.termMonths,
          whatsappNumber:    financingSimulations.whatsappNumber,
          clientName:        financingClients.name,
          createdAt:         financingSimulations.createdAt,
          bankNames:         bankAgg.names,
          bestRateAnnual:    bankAgg.bestRate,
          banksCount:        bankAgg.count,
        })
        .from(financingSimulations)
        .leftJoin(financingClients, eq(financingSimulations.whatsappNumber, financingClients.whatsappNumber))
        .leftJoin(bankAgg, eq(financingSimulations.id, bankAgg.simulationId))
        .where(where)
        .orderBy(desc(financingSimulations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(financingSimulations)
        .leftJoin(financingClients, eq(financingSimulations.whatsappNumber, financingClients.whatsappNumber))
        .where(where),
    ])

    return {
      data: data.map((row) => ({
        ...row,
        banksCount: Number(row.banksCount ?? 0),
        bestRateAnnual: row.bestRateAnnual !== null ? Number(row.bestRateAnnual) : null,
      })) as unknown as SimulationListItem[],
      total: Number(countResult[0].count),
    }
  }
}
