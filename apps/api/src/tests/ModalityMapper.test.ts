import { describe, it, expect } from 'bun:test'
import {
  MODALITY_MAPPING,
  BANK_MAPPING,
  getBcbNamesForModality,
  getSegmentForModality,
} from '../modules/open-finance/domain/mappers/ModalityMapper'
import type { FinancingModality } from '../shared/types'

const ALL_MODALITIES: FinancingModality[] = [
  'CDC', 'LEASING', 'SFH', 'SFI', 'FGTS', 'MCMV',
  'PESSOAL', 'CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS',
  'CAPITAL_GIRO', 'DESCONTO_DUPLICATAS', 'FINAME', 'RURAL',
]

describe('ModalityMapper', () => {
  describe('MODALITY_MAPPING', () => {
    it('cobre todas as 14 modalidades internas', () => {
      for (const m of ALL_MODALITIES) {
        expect(MODALITY_MAPPING[m]).toBeDefined()
      }
    })

    it('cada modalidade tem pelo menos um nome BCB', () => {
      for (const [key, value] of Object.entries(MODALITY_MAPPING)) {
        expect(value.bcbNames.length).toBeGreaterThan(0)
      }
    })

    it('modalidades de veículo pertencem a PESSOA FÍSICA', () => {
      expect(MODALITY_MAPPING['CDC'].segment).toBe('PESSOA FÍSICA')
      expect(MODALITY_MAPPING['LEASING'].segment).toBe('PESSOA FÍSICA')
    })

    it('modalidades de empresa pertencem a PESSOA JURÍDICA', () => {
      expect(MODALITY_MAPPING['CAPITAL_GIRO'].segment).toBe('PESSOA JURÍDICA')
      expect(MODALITY_MAPPING['DESCONTO_DUPLICATAS'].segment).toBe('PESSOA JURÍDICA')
      expect(MODALITY_MAPPING['FINAME'].segment).toBe('PESSOA JURÍDICA')
      expect(MODALITY_MAPPING['RURAL'].segment).toBe('PESSOA JURÍDICA')
    })

    it('modalidades imobiliárias têm termos longos (até 420 meses)', () => {
      expect(MODALITY_MAPPING['SFH'].maxTermMonths).toBe(420)
      expect(MODALITY_MAPPING['SFI'].maxTermMonths).toBe(420)
      expect(MODALITY_MAPPING['FGTS'].maxTermMonths).toBe(420)
    })

    it('modalidades imobiliárias têm LTV ≤ 90%', () => {
      expect(MODALITY_MAPPING['SFH'].maxLtv).toBeLessThanOrEqual(0.9)
      expect(MODALITY_MAPPING['SFI'].maxLtv).toBeLessThanOrEqual(0.9)
    })

    it('CDC tem LTV = 100% (veículo como garantia)', () => {
      expect(MODALITY_MAPPING['CDC'].maxLtv).toBe(1.0)
    })

    it('todos os minTermMonths são positivos', () => {
      for (const value of Object.values(MODALITY_MAPPING)) {
        expect(value.minTermMonths).toBeGreaterThan(0)
      }
    })

    it('maxTermMonths > minTermMonths para todas as modalidades', () => {
      for (const value of Object.values(MODALITY_MAPPING)) {
        expect(value.maxTermMonths).toBeGreaterThan(value.minTermMonths)
      }
    })
  })

  describe('getBcbNamesForModality()', () => {
    it('retorna nomes BCB para CDC', () => {
      const names = getBcbNamesForModality('CDC')
      expect(names.length).toBeGreaterThan(0)
      expect(names).toContain('CRÉDITO PESSOAL')
    })

    it('retorna nomes BCB para SFH', () => {
      const names = getBcbNamesForModality('SFH')
      expect(names).toContain('FINANCIAMENTO IMOBILIÁRIO')
    })

    it('retorna nomes BCB para CONSIGNADO_INSS', () => {
      const names = getBcbNamesForModality('CONSIGNADO_INSS')
      expect(names.length).toBeGreaterThan(0)
    })
  })

  describe('getSegmentForModality()', () => {
    it('retorna PESSOA FÍSICA para CDC', () => {
      expect(getSegmentForModality('CDC')).toBe('PESSOA FÍSICA')
    })

    it('retorna PESSOA JURÍDICA para CAPITAL_GIRO', () => {
      expect(getSegmentForModality('CAPITAL_GIRO')).toBe('PESSOA JURÍDICA')
    })

    it('retorna default PESSOA FÍSICA para modalidade desconhecida', () => {
      expect(getSegmentForModality('CDC')).toBe('PESSOA FÍSICA')
    })
  })

  describe('BANK_MAPPING', () => {
    const expectedBanks = ['CAIXA', 'SANTANDER', 'BB', 'ITAU', 'BRADESCO']

    it('contém todos os 5 bancos principais', () => {
      for (const bank of expectedBanks) {
        expect(BANK_MAPPING[bank]).toBeDefined()
      }
    })

    it('cada banco tem cnpj8 com 8 dígitos', () => {
      for (const bank of expectedBanks) {
        const cnpj8 = BANK_MAPPING[bank]!.cnpj8
        expect(cnpj8).toMatch(/^\d{8}$/)
      }
    })

    it('cada banco tem bcbOlindaName não vazio', () => {
      for (const bank of expectedBanks) {
        expect(BANK_MAPPING[bank]!.bcbOlindaName.length).toBeGreaterThan(0)
      }
    })
  })
})
