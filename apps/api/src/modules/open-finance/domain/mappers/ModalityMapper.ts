import type { FinancingModality } from '@/shared/types'

export interface ModalityMapping {
  internal: FinancingModality
  bcbNames: string[]
  segment: 'PESSOA FÍSICA' | 'PESSOA JURÍDICA'
  minTermMonths: number
  maxTermMonths: number
  maxLtv: number
}

// BCB OLINDA endpoint type: 'daily' = TaxasJurosDiariaPorInicioPeriodo, 'monthly' = TaxasJurosMensalPorMes
export type BcbEndpointType = 'daily' | 'monthly'

export interface ModalityMapping {
  internal: FinancingModality
  bcbNames: string[]
  segment: 'PESSOA FÍSICA' | 'PESSOA JURÍDICA'
  minTermMonths: number
  maxTermMonths: number
  maxLtv: number
  bcbEndpoint: BcbEndpointType
}

export const MODALITY_MAPPING: Record<FinancingModality, ModalityMapping> = {
  CDC: {
    internal: 'CDC',
    bcbNames: [
      'Aquisição de veículos - Prefixado',
      'Aquisição de veículos - Pós-fixado referenciado em juros flutuantes',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  LEASING: {
    internal: 'LEASING',
    bcbNames: [
      'Arrendamento mercantil de veículos - Prefixado',
      'Arrendamento mercantil - Prefixado',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 60,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  SFH: {
    internal: 'SFH',
    bcbNames: [
      'Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR',
      'Financiamento imobiliário com taxas de mercado - Prefixado',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.8,
    bcbEndpoint: 'monthly',
  },
  SFI: {
    internal: 'SFI',
    bcbNames: [
      'Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR',
      'Financiamento imobiliário com taxas de mercado - Prefixado',
      'Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em IPCA',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
    bcbEndpoint: 'monthly',
  },
  FGTS: {
    internal: 'FGTS',
    bcbNames: [
      'Financiamento imobiliário com taxas reguladas - Pós-fixado referenciado em TR',
      'Financiamento imobiliário com taxas reguladas - Prefixado',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
    bcbEndpoint: 'monthly',
  },
  MCMV: {
    internal: 'MCMV',
    bcbNames: [
      'Financiamento imobiliário com taxas reguladas - Pós-fixado referenciado em TR',
      'Financiamento imobiliário com taxas reguladas - Prefixado',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
    bcbEndpoint: 'monthly',
  },
  PESSOAL: {
    internal: 'PESSOAL',
    bcbNames: [
      'Crédito pessoal não consignado - Prefixado',
      'Crédito pessoal não consignado - Pós-fixado referenciado em juros flutuantes',
    ],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  CONSIGNADO_PUBLICO: {
    internal: 'CONSIGNADO_PUBLICO',
    bcbNames: ['Crédito pessoal consignado público - Prefixado'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 96,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  CONSIGNADO_PRIVADO: {
    internal: 'CONSIGNADO_PRIVADO',
    bcbNames: ['Crédito pessoal consignado privado - Prefixado'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  CONSIGNADO_INSS: {
    internal: 'CONSIGNADO_INSS',
    bcbNames: ['Crédito pessoal consignado INSS - Prefixado'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  CAPITAL_GIRO: {
    internal: 'CAPITAL_GIRO',
    bcbNames: [
      'Capital de giro com prazo até 365 dias - Prefixado',
      'Capital de giro com prazo até 365 dias - Pós-fixado referenciado em juros flutuantes',
      'Capital de giro com prazo superior a 365 dias - Prefixado',
    ],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 1,
    maxTermMonths: 60,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  DESCONTO_DUPLICATAS: {
    internal: 'DESCONTO_DUPLICATAS',
    bcbNames: [
      'Desconto de cheques - Prefixado',
      'Antecipação de faturas de cartão de crédito - Prefixado',
    ],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 1,
    maxTermMonths: 12,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  FINAME: {
    internal: 'FINAME',
    bcbNames: [
      'Financiamento de máquinas e equipamentos - Prefixado',
      'Financiamento de máquinas e equipamentos domésticos - Prefixado',
    ],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 12,
    maxTermMonths: 120,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
  RURAL: {
    internal: 'RURAL',
    bcbNames: [
      'Crédito rural - custeio - Prefixado',
      'Crédito rural - investimento - Prefixado',
    ],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 6,
    maxTermMonths: 120,
    maxLtv: 1.0,
    bcbEndpoint: 'daily',
  },
}

export const BANK_MAPPING: Record<string, { bcbOlindaName: string; cnpj8: string }> = {
  CAIXA:     { bcbOlindaName: 'CAIXA ECONOMICA FEDERAL',           cnpj8: '00360305' },
  SANTANDER: { bcbOlindaName: 'BCO SANTANDER (BRASIL) S.A.',       cnpj8: '90400888' },
  BB:        { bcbOlindaName: 'BCO DO BRASIL S.A.',                 cnpj8: '00000000' },
  ITAU:      { bcbOlindaName: 'ITAÚ UNIBANCO S.A.',                 cnpj8: '60701190' },
  BRADESCO:  { bcbOlindaName: 'BCO BRADESCO S.A.',                  cnpj8: '60746948' },
}

export function getBcbNamesForModality(modality: FinancingModality): string[] {
  return MODALITY_MAPPING[modality]?.bcbNames ?? []
}

export function getSegmentForModality(modality: FinancingModality): 'PESSOA FÍSICA' | 'PESSOA JURÍDICA' {
  return MODALITY_MAPPING[modality]?.segment ?? 'PESSOA FÍSICA'
}
