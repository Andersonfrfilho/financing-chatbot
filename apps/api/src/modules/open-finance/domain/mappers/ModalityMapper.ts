import type { FinancingModality } from '@/shared/types'

export interface ModalityMapping {
  internal: FinancingModality
  bcbNames: string[]
  segment: 'PESSOA FÍSICA' | 'PESSOA JURÍDICA'
  minTermMonths: number
  maxTermMonths: number
  maxLtv: number
}

export const MODALITY_MAPPING: Record<FinancingModality, ModalityMapping> = {
  CDC: {
    internal: 'CDC',
    bcbNames: ['CRÉDITO PESSOAL', 'EMPRÉSTIMO PESSOAL', 'AQUISIÇÃO DE VEÍCULOS'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
  },
  LEASING: {
    internal: 'LEASING',
    bcbNames: ['LEASING', 'ARRENDAMENTO MERCANTIL'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 60,
    maxLtv: 1.0,
  },
  SFH: {
    internal: 'SFH',
    bcbNames: ['FINANCIAMENTO IMOBILIÁRIO', 'FINANCIAMENTO - SFH', 'AQUISIÇÃO DE IMÓVEIS - SFH'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.8,
  },
  SFI: {
    internal: 'SFI',
    bcbNames: ['FINANCIAMENTO IMOBILIÁRIO', 'FINANCIAMENTO - SFI', 'AQUISIÇÃO DE IMÓVEIS - SFI'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
  },
  FGTS: {
    internal: 'FGTS',
    bcbNames: ['FGTS', 'FINANCIAMENTO COM FGTS', 'MINHA CASA MINHA VIDA - FGTS'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
  },
  MCMV: {
    internal: 'MCMV',
    bcbNames: ['MINHA CASA MINHA VIDA', 'HABITAÇÃO - MCMV'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 12,
    maxTermMonths: 420,
    maxLtv: 0.9,
  },
  PESSOAL: {
    internal: 'PESSOAL',
    bcbNames: ['CRÉDITO PESSOAL', 'EMPRÉSTIMO PESSOAL', 'CRÉDITO PESSOAL SEM CONSIGNAÇÃO'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
  },
  CONSIGNADO_PUBLICO: {
    internal: 'CONSIGNADO_PUBLICO',
    bcbNames: ['CRÉDITO CONSIGNADO', 'CRÉDITO CONSIGNADO - SERVIDOR PÚBLICO'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 96,
    maxLtv: 1.0,
  },
  CONSIGNADO_PRIVADO: {
    internal: 'CONSIGNADO_PRIVADO',
    bcbNames: ['CRÉDITO CONSIGNADO', 'CRÉDITO CONSIGNADO - PRIVADO'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
  },
  CONSIGNADO_INSS: {
    internal: 'CONSIGNADO_INSS',
    bcbNames: ['CRÉDITO CONSIGNADO', 'CRÉDITO CONSIGNADO - INSS', 'CRÉDITO CONSIGNADO PARA APOSENTADOS E PENSIONISTAS DO INSS'],
    segment: 'PESSOA FÍSICA',
    minTermMonths: 6,
    maxTermMonths: 84,
    maxLtv: 1.0,
  },
  CAPITAL_GIRO: {
    internal: 'CAPITAL_GIRO',
    bcbNames: ['CAPITAL DE GIRO', 'CAPITAL DE GIRO ROTATIVO'],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 1,
    maxTermMonths: 60,
    maxLtv: 1.0,
  },
  DESCONTO_DUPLICATAS: {
    internal: 'DESCONTO_DUPLICATAS',
    bcbNames: ['DESCONTO DE DUPLICATAS', 'DESCONTO DE TÍTULOS'],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 1,
    maxTermMonths: 12,
    maxLtv: 1.0,
  },
  FINAME: {
    internal: 'FINAME',
    bcbNames: ['FINAME', 'FINANCIAMENTO DE MÁQUINAS E EQUIPAMENTOS'],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 12,
    maxTermMonths: 120,
    maxLtv: 1.0,
  },
  RURAL: {
    internal: 'RURAL',
    bcbNames: ['CRÉDITO RURAL', 'CUSTEIO RURAL', 'INVESTIMENTO RURAL'],
    segment: 'PESSOA JURÍDICA',
    minTermMonths: 6,
    maxTermMonths: 120,
    maxLtv: 1.0,
  },
}

export const BANK_MAPPING: Record<string, { bcbOlindaName: string; cnpj8: string }> = {
  CAIXA:     { bcbOlindaName: 'CAIXA ECONÔMICA FEDERAL',          cnpj8: '36122169' },
  SANTANDER: { bcbOlindaName: 'BANCO SANTANDER (BRASIL) S.A.',     cnpj8: '90400888' },
  BB:        { bcbOlindaName: 'BANCO DO BRASIL S/A',               cnpj8: '00000000' },
  ITAU:      { bcbOlindaName: 'ITAÚ UNIBANCO S.A.',                cnpj8: '60701190' },
  BRADESCO:  { bcbOlindaName: 'BANCO BRADESCO S.A.',               cnpj8: '60746948' },
}

export function getBcbNamesForModality(modality: FinancingModality): string[] {
  return MODALITY_MAPPING[modality]?.bcbNames ?? []
}

export function getSegmentForModality(modality: FinancingModality): 'PESSOA FÍSICA' | 'PESSOA JURÍDICA' {
  return MODALITY_MAPPING[modality]?.segment ?? 'PESSOA FÍSICA'
}
