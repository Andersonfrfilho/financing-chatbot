import { sql, desc, gte } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { leads, financingSimulations, simulationResults, banks } from '@/infra/database/schema'

export class GetCommercialReportUseCase {
  async execute(startDate: Date, endDate: Date) {
    const [leadFunnel, topBanks, simulationVolume] = await Promise.all([
      db
        .select({ status: leads.status, count: sql<number>`count(*)` })
        .from(leads)
        .where(sql`created_at BETWEEN ${startDate} AND ${endDate}`)
        .groupBy(leads.status),

      db
        .select({ bankName: banks.name, bankCode: banks.code, count: sql<number>`count(*)` })
        .from(simulationResults)
        .innerJoin(banks, sql`${simulationResults.bankId} = ${banks.id}`)
        .where(sql`${simulationResults.createdAt} BETWEEN ${startDate} AND ${endDate}`)
        .groupBy(banks.name, banks.code)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      db
        .select({ financingType: financingSimulations.financingType, count: sql<number>`count(*)`, totalAmount: sql<number>`sum(requested_amount)` })
        .from(financingSimulations)
        .where(sql`created_at BETWEEN ${startDate} AND ${endDate}`)
        .groupBy(financingSimulations.financingType),
    ])

    return {
      period: { startDate, endDate },
      leadFunnel: Object.fromEntries(leadFunnel.map((r) => [r.status, Number(r.count)])),
      topBanks: topBanks.map((r) => ({ ...r, count: Number(r.count) })),
      simulationVolume: simulationVolume.map((r) => ({
        financingType: r.financingType,
        count: Number(r.count),
        totalAmount: Number(r.totalAmount ?? 0),
      })),
    }
  }
}
