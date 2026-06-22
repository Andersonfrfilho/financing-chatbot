import { logger } from '@/shared/logger'
import type { FinancingModality } from '@/shared/types'
import type { OpenFinanceProvider, OpenFinanceRate, ReferenceTaxes } from '../../domain/providers/OpenFinanceProvider'
import {
  MODALITY_MAPPING,
  BANK_MAPPING,
  getBcbNamesForModality,
  getSegmentForModality,
} from '../../domain/mappers/ModalityMapper'

const OLINDA_BASE = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata'
const SGS_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'

const SGS_SERIES = {
  SELIC_META: 432,
  CDI: 12,
} as const

// In-memory cache to avoid hammering BCB
const memCache = new Map<string, { value: unknown; expiresAt: number }>()

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    memCache.delete(key)
    return null
  }
  return entry.value as T
}

function memSet(key: string, value: unknown, ttlSeconds: number): void {
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

interface OlindaTaxaJuros {
  Segmento: string
  Modalidade: string
  InstituicaoFinanceira: string
  TaxaJurosAoMes: number
  TaxaJurosAoAno: number
  cnpj8: string
  Posicao: number
  InicioPeriodo: string
  FimPeriodo: string
}

interface OlindaResponse {
  value: OlindaTaxaJuros[]
}

interface SGSPoint {
  data: string   // dd/MM/yyyy
  valor: string
}

export class BcbOlindaProviderImplementation implements OpenFinanceProvider {
  private readonly log = logger.child('BcbOlindaProvider')

  async fetchRates(bankCode: string, modality: FinancingModality): Promise<OpenFinanceRate[]> {
    const segment = getSegmentForModality(modality)
    const bcbNames = getBcbNamesForModality(modality)

    if (bcbNames.length === 0) {
      this.log.warn('Sem mapeamento BCB para modalidade', { modality })
      return []
    }

    const cacheKey = `olinda:${bankCode}:${modality}`
    const cached = memGet<OpenFinanceRate[]>(cacheKey)
    if (cached) {
      this.log.debug('Taxa em cache (memória)', { bankCode, modality })
      return cached
    }

    // Try 3 business days back to account for publication delay
    const dates = this.getRecentBusinessDates(3)

    for (const date of dates) {
      const rates = await this.fetchOlindaForDate(bankCode, modality, segment, bcbNames, date)
      if (rates.length > 0) {
        memSet(cacheKey, rates, 6 * 60 * 60) // 6h
        return rates
      }
    }

    this.log.warn('Nenhuma taxa encontrada no OLINDA', { bankCode, modality })
    return []
  }

  async fetchReferenceTaxes(): Promise<ReferenceTaxes> {
    const cacheKey = 'sgs:reference_taxes'
    const cached = memGet<ReferenceTaxes>(cacheKey)
    if (cached) return cached

    try {
      const [selicData, cdiData] = await Promise.all([
        this.fetchSgsSeries(SGS_SERIES.SELIC_META, 1),
        this.fetchSgsSeries(SGS_SERIES.CDI, 1),
      ])

      const selicMeta = selicData.length > 0 ? parseFloat(selicData[selicData.length - 1]!.valor) : 10.5
      const cdi = cdiData.length > 0 ? parseFloat(cdiData[cdiData.length - 1]!.valor) : 10.4
      const date = selicData.length > 0 ? selicData[selicData.length - 1]!.data : new Date().toLocaleDateString('pt-BR')

      const result: ReferenceTaxes = { selicMeta, cdi, date }
      memSet(cacheKey, result, 6 * 60 * 60) // 6h
      this.log.info('Taxas de referência BCB obtidas', { selicMeta, cdi, date })
      return result
    } catch (err) {
      this.log.warn('Falha ao buscar taxas de referência SGS, usando defaults', { err: String(err) })
      return { selicMeta: 10.5, cdi: 10.4, date: new Date().toLocaleDateString('pt-BR') }
    }
  }

  private async fetchOlindaForDate(
    bankCode: string,
    modality: FinancingModality,
    segment: string,
    bcbNames: string[],
    date: string,
  ): Promise<OpenFinanceRate[]> {
    const mapping = MODALITY_MAPPING[modality]
    const bankInfo = BANK_MAPPING[bankCode]

    const url = new URL(`${OLINDA_BASE}/TaxasJurosDiariaPorInicio(InicioPeriodo=@InicioPeriodo)`)
    url.searchParams.set('@InicioPeriodo', `'${date}'`)
    url.searchParams.set('$format', 'json')
    url.searchParams.set('$top', '100')
    url.searchParams.set(
      '$select',
      'Segmento,Modalidade,InstituicaoFinanceira,TaxaJurosAoMes,TaxaJurosAoAno,cnpj8,Posicao,InicioPeriodo,FimPeriodo',
    )

    const filterClauses: string[] = [`Segmento eq '${segment}'`]

    // Filter by bank if we have its CNPJ8
    if (bankInfo) {
      filterClauses.push(`cnpj8 eq '${bankInfo.cnpj8}'`)
    }

    // Filter by modality names (OR between possible BCB names)
    const modalityFilter = bcbNames
      .map((n) => `Modalidade eq '${n}'`)
      .join(' or ')
    filterClauses.push(`(${modalityFilter})`)

    url.searchParams.set('$filter', filterClauses.join(' and '))

    const startMs = Date.now()
    try {
      const resp = await fetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      })

      const durationMs = Date.now() - startMs
      this.log.info('OLINDA chamada', {
        bankCode,
        modality,
        date,
        status: resp.status,
        duration_ms: durationMs,
      })

      if (!resp.ok) return []

      const body = await resp.json() as OlindaResponse
      return this.parseOlindaResponse(body, bankCode, modality, mapping)
    } catch {
      this.log.warn('Falha ao chamar OLINDA', { bankCode, modality, date, duration_ms: Date.now() - startMs })
      return []
    }
  }

  private parseOlindaResponse(
    body: OlindaResponse,
    bankCode: string,
    modality: FinancingModality,
    mapping: typeof MODALITY_MAPPING[FinancingModality] | undefined,
  ): OpenFinanceRate[] {
    if (!Array.isArray(body?.value) || body.value.length === 0) return []

    const rates: OpenFinanceRate[] = []

    for (const item of body.value) {
      const rateAnnual = item.TaxaJurosAoAno ?? 0
      if (rateAnnual <= 0) continue

      rates.push({
        bankCode,
        modality,
        rateAnnual,
        referentialRateIndexer: 0,
        minTermMonths: mapping?.minTermMonths ?? 6,
        maxTermMonths: mapping?.maxTermMonths ?? 84,
        maxLtv: mapping?.maxLtv ?? 1.0,
      })
    }

    // Return lowest rate found (best for the client)
    rates.sort((a, b) => a.rateAnnual - b.rateAnnual)
    return rates.slice(0, 1)
  }

  private async fetchSgsSeries(serieId: number, lastN: number): Promise<SGSPoint[]> {
    const url = `${SGS_BASE}.${serieId}/dados/ultimos/${lastN}?formato=json`
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      })
      if (!resp.ok) return []
      return await resp.json() as SGSPoint[]
    } catch {
      return []
    }
  }

  // Returns last N business dates as ISO strings (yyyy-MM-dd)
  private getRecentBusinessDates(n: number): string[] {
    const dates: string[] = []
    const d = new Date()
    while (dates.length < n) {
      d.setDate(d.getDate() - 1)
      const day = d.getDay()
      if (day !== 0 && day !== 6) { // skip weekends
        dates.push(d.toISOString().slice(0, 10))
      }
    }
    return dates
  }
}
