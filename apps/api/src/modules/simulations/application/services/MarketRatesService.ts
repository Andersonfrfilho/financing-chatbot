const SGS_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'

// BCB SGS series IDs for specific modalities
const SGS_SERIES = {
  // Monthly rates
  CDC_VEHICLE_PF_MONTHLY: 25466,   // Taxa CDC veículos PF (ao mês)
  CDC_VEHICLE_PJ_MONTHLY: 25467,   // Taxa CDC veículos PJ (ao mês)
  PERSONAL_CREDIT_MONTHLY: 4390,   // Crédito pessoal PF (ao mês)
  CONSIGNADO_MONTHLY: 4391,        // Consignado PF (ao mês)
  // Annual rates
  SFH_ANNUAL: 7811,                // Taxa média SFH (ao ano)
  TOTAL_PF_ANNUAL: 20714,          // Total crédito livre PF (ao ano)
  CET_CDC_VEHICLE: 20748,          // CET CDC veículos (ao ano)
} as const

interface SgsPoint {
  data: string   // dd/MM/yyyy
  valor: string
}

export interface MarketRates {
  cdcVehiclePfMonthly: number   // % ao mês
  cdcVehiclePfAnnual: number    // % ao ano (composto)
  cetCdcVehicle: number         // CET anual
  sfhAnnual: number             // % ao ano
  personalCreditMonthly: number
  consignadoMonthly: number
  referenceDate: string
}

const cache: { rates: MarketRates | null; fetchedAt: number } = { rates: null, fetchedAt: 0 }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h

export class MarketRatesService {
  async getRates(): Promise<MarketRates> {
    if (cache.rates && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.rates
    }

    const [cdcVehicle, cetCdc, sfh, personalCredit, consignado] = await Promise.allSettled([
      this.fetchSeries(SGS_SERIES.CDC_VEHICLE_PF_MONTHLY),
      this.fetchSeries(SGS_SERIES.CET_CDC_VEHICLE),
      this.fetchSeries(SGS_SERIES.SFH_ANNUAL),
      this.fetchSeries(SGS_SERIES.PERSONAL_CREDIT_MONTHLY),
      this.fetchSeries(SGS_SERIES.CONSIGNADO_MONTHLY),
    ])

    const cdcMonthly = cdcVehicle.status === 'fulfilled' ? (cdcVehicle.value ?? 3.79) : 3.79
    const cetAnnual = cetCdc.status === 'fulfilled' ? (cetCdc.value ?? 57.0) : 57.0
    const sfhRate = sfh.status === 'fulfilled' ? (sfh.value ?? 0.17) : 0.17
    const personalRate = personalCredit.status === 'fulfilled' ? (personalCredit.value ?? 5.5) : 5.5
    const consignadoRate = consignado.status === 'fulfilled' ? (consignado.value ?? 1.9) : 1.9

    const rates: MarketRates = {
      cdcVehiclePfMonthly: cdcMonthly,
      cdcVehiclePfAnnual: this.monthlyToAnnual(cdcMonthly),
      cetCdcVehicle: cetAnnual,
      sfhAnnual: sfhRate * 12,  // series returns monthly, multiply for annual approx
      personalCreditMonthly: personalRate,
      consignadoMonthly: consignadoRate,
      referenceDate: new Date().toLocaleDateString('pt-BR'),
    }

    cache.rates = rates
    cache.fetchedAt = Date.now()
    return rates
  }

  private monthlyToAnnual(monthlyPct: number): number {
    return (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100
  }

  private async fetchSeries(serieId: number): Promise<number | null> {
    try {
      const resp = await fetch(`${SGS_BASE}.${serieId}/dados/ultimos/1?formato=json`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) return null
      const data = await resp.json() as SgsPoint[]
      if (!data.length) return null
      return parseFloat(data[data.length - 1]!.valor)
    } catch {
      return null
    }
  }
}
