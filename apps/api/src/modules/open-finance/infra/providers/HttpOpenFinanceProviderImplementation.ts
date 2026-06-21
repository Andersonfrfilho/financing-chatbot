import type { OpenFinanceProvider, OpenFinanceRate } from '../../domain/providers/OpenFinanceProvider'
import type { FinancingModality } from '@/shared/types'

const BANK_BASE_URLS: Record<string, string> = {
  CAIXA: 'https://opendata.api.caixa.gov.br',
  SANTANDER: 'https://openbanking.santander.com.br',
  BB: 'https://opendata.api.bb.com.br',
  ITAU: 'https://secure.api.itau/openbanking',
  BRADESCO: 'https://proxy.api.prebanco.com.br',
}

const MODALITY_PATH: Partial<Record<FinancingModality, string>> = {
  SFH: 'personal-financing',
  SFI: 'personal-financing',
  FGTS: 'personal-financing',
  MCMV: 'personal-financing',
  CDC: 'personal-loans',
  PESSOAL: 'personal-loans',
  CONSIGNADO_PUBLICO: 'personal-loans',
  CONSIGNADO_PRIVADO: 'personal-loans',
  CONSIGNADO_INSS: 'personal-loans',
  CAPITAL_GIRO: 'business-loans',
  FINAME: 'business-financing',
}

export class HttpOpenFinanceProviderImplementation implements OpenFinanceProvider {
  async fetchRates(bankCode: string, modality: FinancingModality): Promise<OpenFinanceRate[]> {
    const baseUrl = BANK_BASE_URLS[bankCode]
    if (!baseUrl) return []

    const path = MODALITY_PATH[modality] ?? 'personal-financing'
    const url = `${baseUrl}/open-banking/products-services/v1/${path}`

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) return this.getFallbackRates(bankCode, modality)

      const body = await response.json() as Record<string, unknown>
      return this.parseResponse(bankCode, modality, body)
    } catch {
      return this.getFallbackRates(bankCode, modality)
    }
  }

  private parseResponse(
    bankCode: string,
    modality: FinancingModality,
    body: Record<string, unknown>,
  ): OpenFinanceRate[] {
    try {
      const data = (body as { data?: { brand?: { companies?: unknown[] } } })
        .data?.brand?.companies

      if (!Array.isArray(data)) return this.getFallbackRates(bankCode, modality)

      const rates: OpenFinanceRate[] = []

      for (const company of data) {
        const products = (company as Record<string, unknown[]>).personalFinancings ?? []
        for (const product of products) {
          const p = product as Record<string, unknown>
          const interestRates = p.interestRates as Array<Record<string, unknown>> | undefined
          if (!interestRates) continue

          for (const rate of interestRates) {
            const applications = rate.applications as Array<Record<string, string>> | undefined
            const rateValue = parseFloat(
              (applications?.[1]?.rate ?? applications?.[0]?.rate ?? '0.08') as string,
            )
            rates.push({
              bankCode,
              modality,
              rateAnnual: rateValue,
              referentialRateIndexer: 0,
              minTermMonths: 12,
              maxTermMonths: 420,
              maxLtv: 0.8,
            })
          }
        }
      }

      return rates.length > 0 ? rates : this.getFallbackRates(bankCode, modality)
    } catch {
      return this.getFallbackRates(bankCode, modality)
    }
  }

  // Taxas de fallback baseadas em médias de mercado (jun/2026)
  private getFallbackRates(bankCode: string, modality: FinancingModality): OpenFinanceRate[] {
    const fallbacks: Record<string, Partial<Record<FinancingModality, number>>> = {
      CAIXA: { SFH: 0.082, SFI: 0.099, FGTS: 0.05, MCMV: 0.04, PESSOAL: 0.18, CDC: 0.14 },
      SANTANDER: { SFH: 0.089, SFI: 0.105, PESSOAL: 0.22, CONSIGNADO_PUBLICO: 0.145, CDC: 0.155 },
      BB: { SFH: 0.085, SFI: 0.102, FGTS: 0.055, PESSOAL: 0.20, CONSIGNADO_PUBLICO: 0.14, CDC: 0.15 },
      ITAU: { SFH: 0.091, SFI: 0.108, PESSOAL: 0.23, CONSIGNADO_PUBLICO: 0.148, CDC: 0.16 },
      BRADESCO: { SFH: 0.088, SFI: 0.104, PESSOAL: 0.21, CONSIGNADO_PUBLICO: 0.146, CDC: 0.158 },
    }
    const rate = fallbacks[bankCode]?.[modality] ?? 0.12

    return [{
      bankCode,
      modality,
      rateAnnual: rate,
      referentialRateIndexer: 0,
      minTermMonths: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? 12 : 6,
      maxTermMonths: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? 420 : 84,
      maxLtv: ['SFH', 'SFI', 'FGTS', 'MCMV'].includes(modality) ? 0.8 : 1.0,
    }]
  }
}
