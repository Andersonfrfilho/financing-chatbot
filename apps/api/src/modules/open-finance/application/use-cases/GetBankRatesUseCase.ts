import { eq, and, desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { logger } from '@/shared/logger'
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
    const log = logger.child('GetBankRates', modality)
    const cacheKey = `rates:list:${modality}`
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      const result = JSON.parse(cached) as BankRateResult[]
      log.debug('Taxas do cache', { count: result.length })
      return result
    }

    // Verifica quantos bancos ativos existem
    const activeBanks = await this.db
      .select({ id: schema.banks.id })
      .from(schema.banks)
      .where(eq(schema.banks.active, true))

    log.debug('Bancos ativos encontrados', { count: activeBanks.length })

    if (activeBanks.length === 0) {
      log.warn('Nenhum banco ativo no sistema')
      return []
    }

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
          eq(schema.banks.active, true),
        ),
      )
      .orderBy(desc(schema.bankRates.effectiveDate))

    log.debug('Taxas encontradas no DB', { count: rates.length, modality })

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
      log.debug('Cachando taxas', { count: result.length })
      await this.cache.set(cacheKey, JSON.stringify(result), 3600)
    } else {
      // Diagnóstico detalhado
      const allRates = await this.db.select().from(schema.bankRates)
      const otherModalities = new Set(allRates.map(r => r.modality))
      log.error('Nenhuma taxa encontrada', {
        modality,
        banksAtivos: activeBanks.length,
        totalTaxasNoDB: allRates.length,
        modalidadesDisponiveis: Array.from(otherModalities),
        motivo: allRates.length === 0
          ? 'Tabela bank_rates está vazia - seed não foi executada'
          : `Nenhuma taxa para modalidade ${modality}. Usar seed ou aguardar fetch de dados de open finance`,
      })
    }

    return result
  }
}
