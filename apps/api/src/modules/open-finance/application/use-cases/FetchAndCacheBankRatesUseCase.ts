import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { logger } from '@/shared/logger'
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
    const log = logger.child('FetchAndCacheBankRates', financingType)
    const modalities = MODALITIES_BY_FINANCING_TYPE[financingType] ?? ['SFH']
    const banks = await this.db.select().from(schema.banks).where(eq(schema.banks.active, true))

    log.info('Iniciando', { banksCount: banks.length, modalities })

    if (banks.length === 0) {
      log.warn('Nenhum banco ativo encontrado')
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    let ratesInserted = 0
    const ratesToInsert: schema.NewBankRate[] = []

    for (const bank of banks) {
      for (const modality of modalities) {
        const cacheKey = `rates:${bank.code}:${modality}:${today}`
        const cached = await this.cache.get(cacheKey)
        if (cached) {
          log.debug('Taxa em cache', { bank: bank.code, modality })
          continue
        }

        const rates = await this.openFinanceProvider.fetchRates(bank.code, modality)
        if (rates.length === 0) {
          log.debug('Nenhuma taxa retornada da API, usando fallback', { bank: bank.code, modality })
          continue
        }

        const rate = rates[0]!
        ratesToInsert.push({
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

        ratesInserted++
        log.debug('Taxa pronta para inserir', { bank: bank.code, modality, rate: rate.rateAnnual })

        await this.cache.set(cacheKey, JSON.stringify(rate), CACHE_TTL_SECONDS)
      }
    }

    // Insere todas as taxas de uma vez
    if (ratesToInsert.length > 0) {
      await this.db.insert(schema.bankRates).values(ratesToInsert).onConflictDoNothing()
      log.info('Taxas de open finance inseridas', { count: ratesToInsert.length })
    }

    // Fallback: insere taxas padrão se nenhuma foi encontrada
    if (ratesInserted === 0) {
      log.warn('Nenhuma taxa de open finance encontrada, usando fallback')
      await this.insertFallbackRates(banks, modalities, today)
    }

    log.info('Concluído', { ratesInserted })
  }

  private async insertFallbackRates(
    banks: typeof schema.banks.$inferSelect[],
    modalities: FinancingModality[],
    today: string,
  ): Promise<void> {
    const fallbackRates: Record<string, Partial<Record<FinancingModality, number>>> = {
      CAIXA: { SFH: 0.082, SFI: 0.099, FGTS: 0.05, MCMV: 0.04, PESSOAL: 0.18, CDC: 0.14, CONSIGNADO_PUBLICO: 0.145 },
      SANTANDER: { SFH: 0.089, SFI: 0.105, PESSOAL: 0.22, CONSIGNADO_PUBLICO: 0.145, CDC: 0.155 },
      BB: { SFH: 0.085, SFI: 0.102, FGTS: 0.055, PESSOAL: 0.20, CONSIGNADO_PUBLICO: 0.14, CDC: 0.15 },
      ITAU: { SFH: 0.091, SFI: 0.108, PESSOAL: 0.23, CONSIGNADO_PUBLICO: 0.148, CDC: 0.16 },
      BRADESCO: { SFH: 0.088, SFI: 0.104, PESSOAL: 0.21, CONSIGNADO_PUBLICO: 0.146, CDC: 0.158 },
    }

    const fallbackToInsert: schema.NewBankRate[] = []
    for (const bank of banks) {
      for (const modality of modalities) {
        const rate = fallbackRates[bank.code]?.[modality] ?? 0.12
        fallbackToInsert.push({
          bankId: bank.id,
          modality: modality as schema.NewBankRate['modality'],
          rateAnnual: rate.toFixed(6),
          referentialRateIndexer: '0.000000',
          minTermMonths: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? 12 : 6,
          maxTermMonths: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? 420 : 84,
          maxLtv: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? '0.8000' : '1.0000',
          effectiveDate: today,
          source: 'fallback',
        })
      }
    }

    if (fallbackToInsert.length > 0) {
      await this.db.insert(schema.bankRates).values(fallbackToInsert).onConflictDoNothing()
      logger.info('Fallback rates inseridas', { count: fallbackToInsert.length })
    }
  }
}
