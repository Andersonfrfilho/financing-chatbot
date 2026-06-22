import type { FinancingModality } from '@/shared/types'

export interface OpenFinanceRate {
  bankCode: string
  modality: FinancingModality
  rateAnnual: number
  referentialRateIndexer: number
  minTermMonths: number
  maxTermMonths: number
  maxLtv: number
}

export interface ReferenceTaxes {
  selicMeta: number
  cdi: number
  date: string
}

export interface OpenFinanceProvider {
  fetchRates(bankCode: string, modality: FinancingModality): Promise<OpenFinanceRate[]>
  fetchReferenceTaxes(): Promise<ReferenceTaxes>
}
