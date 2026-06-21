import { eq, and, desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import type { FinancingModality } from '@/shared/types'
import * as schema from '@/infra/database/schema'

export interface BankRateResult {
  bankId: string
  bankCode: string
  bankName: string
  modality: FinancingModality
  rateAnnual: number
  minTermMonths: number
  maxTermMonths: number
  maxLtv: number
}

export class GetBankRatesUseCase {
  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheProvider,
  ) {}

  async execute(modality: FinancingModality): Promise<BankRateResult[]> {
    const cacheKey = `rates:list:${modality}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached) as BankRateResult[]

    const today = new Date().toISOString().slice(0, 10)

    const rates = await this.db
      .select({
        bankId: schema.banks.id,
        bankCode: schema.banks.code,
        bankName: schema.banks.name,
        modality: schema.bankRates.modality,
        rateAnnual: schema.bankRates.rateAnnual,
        minTermMonths: schema.bankRates.minTermMonths,
        maxTermMonths: schema.bankRates.maxTermMonths,
        maxLtv: schema.bankRates.maxLtv,
      })
      .from(schema.bankRates)
      .innerJoin(schema.banks, eq(schema.bankRates.bankId, schema.banks.id))
      .where(
        and(
          eq(schema.bankRates.modality, modality as schema.BankRate['modality']),
          eq(schema.bankRates.effectiveDate, today),
          eq(schema.banks.active, true),
        ),
      )
      .orderBy(desc(schema.bankRates.effectiveDate))

    const result: BankRateResult[] = rates.map((r) => ({
      bankId: r.bankId,
      bankCode: r.bankCode,
      bankName: r.bankName,
      modality: r.modality as FinancingModality,
      rateAnnual: parseFloat(r.rateAnnual),
      minTermMonths: r.minTermMonths,
      maxTermMonths: r.maxTermMonths,
      maxLtv: parseFloat(r.maxLtv),
    }))

    if (result.length > 0) {
      await this.cache.set(cacheKey, JSON.stringify(result), 3600)
    }

    return result
  }
}
