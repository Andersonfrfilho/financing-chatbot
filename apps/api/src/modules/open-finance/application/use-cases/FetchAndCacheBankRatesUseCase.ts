import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import type { OpenFinanceProvider } from '../../domain/providers/OpenFinanceProvider'
import type { FinancingModality } from '@/shared/types'
import * as schema from '@/infra/database/schema'

const CACHE_TTL_SECONDS = 24 * 60 * 60 // 24h

const MODALITIES_BY_FINANCING_TYPE: Record<string, FinancingModality[]> = {
  imobiliario: ['SFH', 'SFI', 'FGTS', 'MCMV'],
  veiculo: ['CDC', 'LEASING'],
  pessoal: ['PESSOAL'],
  consignado: ['CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS'],
  empresa: ['CAPITAL_GIRO', 'DESCONTO_DUPLICATAS'],
  equipamento: ['FINAME'],
  rural: ['RURAL'],
}

export class FetchAndCacheBankRatesUseCase {
  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheProvider,
    private readonly openFinanceProvider: OpenFinanceProvider,
  ) {}

  async execute(financingType: string): Promise<void> {
    const modalities = MODALITIES_BY_FINANCING_TYPE[financingType] ?? ['SFH']
    const banks = await this.db.select().from(schema.banks).where(eq(schema.banks.active, true))

    const today = new Date().toISOString().slice(0, 10)

    for (const bank of banks) {
      for (const modality of modalities) {
        const cacheKey = `rates:${bank.code}:${modality}:${today}`
        const cached = await this.cache.get(cacheKey)
        if (cached) continue

        const rates = await this.openFinanceProvider.fetchRates(bank.code, modality)
        if (rates.length === 0) continue

        const rate = rates[0]!

        await this.db
          .insert(schema.bankRates)
          .values({
            bankId: bank.id,
            modality: modality as schema.NewBankRate['modality'],
            rateAnnual: rate.rateAnnual.toFixed(6),
            referentialRateIndexer: rate.referentialRateIndexer.toFixed(6),
            minTermMonths: rate.minTermMonths,
            maxTermMonths: rate.maxTermMonths,
            maxLtv: rate.maxLtv.toFixed(4),
            effectiveDate: today,
            source: 'open_finance',
          })
          .onConflictDoNothing()

        await this.cache.set(cacheKey, JSON.stringify(rate), CACHE_TTL_SECONDS)
      }
    }
  }
}
