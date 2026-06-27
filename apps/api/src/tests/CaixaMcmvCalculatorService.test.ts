import { describe, it, expect } from 'bun:test'
import { CaixaMcmvCalculatorService } from '../modules/simulations/application/services/CaixaMcmvCalculatorService'

const calculator = new CaixaMcmvCalculatorService()

const BASE_INPUT = {
  propertyValue: 300_000,
  financedAmount: 240_000,
  termMonths: 420,
  familyMonthlyIncome: 8_000,
  applicantAgeYears: 35,
}

describe('CaixaMcmvCalculatorService', () => {
  describe('enquadramento de faixa', () => {
    it('enquadra na faixa 1 para renda baixa e imóvel pequeno', () => {
      const result = calculator.calculate({
        ...BASE_INPUT,
        propertyValue: 180_000,
        financedAmount: 144_000,
        familyMonthlyIncome: 2_000,
      })
      expect(result.mcmvFaixa).toBe(1)
      expect(result.annualRate).toBeCloseTo(0.048548, 5)
    })

    it('enquadra na faixa 7 para renda R$ 8.000 e imóvel R$ 350.000', () => {
      const result = calculator.calculate({
        ...BASE_INPUT,
        propertyValue: 350_000,
        financedAmount: 280_000,
        familyMonthlyIncome: 8_000,
      })
      expect(result.mcmvFaixa).toBe(7)
      expect(result.annualRate).toBeCloseTo(0.084722, 5)
    })

    it('enquadra na faixa 10 para renda e imóvel acima de todos os limites', () => {
      const result = calculator.calculate({
        ...BASE_INPUT,
        propertyValue: 3_000_000,
        financedAmount: 2_400_000,
        familyMonthlyIncome: 100_000,
      })
      expect(result.mcmvFaixa).toBe(10)
      expect(result.annualRate).toBeCloseTo(0.134000, 5)
    })

    it('sobe de faixa quando valor do imóvel excede limite da faixa de renda', () => {
      // Renda R$ 2.000 enquadraria na faixa 1, mas imóvel R$ 250.000 > limite de R$ 210.000
      // deve usar faixa 7 que comporta ambas as condições
      const result = calculator.calculate({
        ...BASE_INPUT,
        propertyValue: 250_000,
        financedAmount: 200_000,
        familyMonthlyIncome: 2_000,
      })
      expect(result.mcmvFaixa).toBeGreaterThanOrEqual(7)
    })
  })

  describe('ajuste de prazo por idade', () => {
    it('limita o prazo quando idade + prazo excede 966 meses', () => {
      // 50 anos = 600 meses → prazo máximo = 966 - 600 = 366 meses
      const result = calculator.calculate({
        ...BASE_INPUT,
        applicantAgeYears: 50,
        termMonths: 420,
      })
      expect(result.effectiveTermMonths).toBe(366)
    })

    it('mantém o prazo solicitado quando não excede o limite por idade', () => {
      // 30 anos = 360 meses → máximo por idade = 966 - 360 = 606 → prazo 360 meses é válido
      const result = calculator.calculate({
        ...BASE_INPUT,
        applicantAgeYears: 30,
        termMonths: 360,
      })
      expect(result.effectiveTermMonths).toBe(360)
    })
  })

  describe('cálculo SAC com seguros', () => {
    it('primeira parcela é maior que a última (SAC decrescente)', () => {
      const result = calculator.calculate(BASE_INPUT)
      expect(result.firstInstallment).toBeGreaterThan(result.lastInstallment)
    })

    it('custo total = financiado + juros + MIP + DFI + TAC', () => {
      const result = calculator.calculate(BASE_INPUT)
      const expected = BASE_INPUT.financedAmount + result.totalInterest + result.totalMip + result.totalDfi + result.tac
      expect(result.totalCost).toBeCloseTo(expected, 0)
    })

    it('tac é sempre R$ 25,00', () => {
      const result = calculator.calculate(BASE_INPUT)
      expect(result.tac).toBe(25)
    })

    it('breakdown da primeira parcela inclui TAC e soma corretamente', () => {
      const result = calculator.calculate(BASE_INPUT)
      const { amortization, interest, mip, dfi, tac } = result.firstInstallmentBreakdown
      const sum = amortization + interest + mip + dfi + tac
      expect(result.firstInstallment).toBeCloseTo(sum, 1)
    })

    it('percentual de comprometimento de renda é calculado corretamente', () => {
      const result = calculator.calculate(BASE_INPUT)
      const expected = (result.firstInstallment / BASE_INPUT.familyMonthlyIncome) * 100
      expect(result.incomeCommitmentPercent).toBeCloseTo(expected, 1)
    })
  })

  describe('taxas MIP por idade', () => {
    it('proponente de 25 anos usa taxa MIP da faixa 18-25', () => {
      const rate = calculator.getMipMonthlyRate(25)
      expect(rate).toBeCloseTo(0.000093, 6)
    })

    it('proponente de 60 anos usa taxa MIP da faixa 56-60', () => {
      const rate = calculator.getMipMonthlyRate(60)
      expect(rate).toBeCloseTo(0.001533, 6)
    })
  })

  describe('validações de entrada', () => {
    it('lança erro quando valor financiado é zero', () => {
      expect(() => calculator.calculate({ ...BASE_INPUT, financedAmount: 0 })).toThrow()
    })

    it('lança erro quando renda familiar é zero', () => {
      expect(() => calculator.calculate({ ...BASE_INPUT, familyMonthlyIncome: 0 })).toThrow()
    })

    it('lança erro quando idade é maior ou igual a 80.5 anos', () => {
      expect(() => calculator.calculate({ ...BASE_INPUT, applicantAgeYears: 81 })).toThrow()
    })

    it('lança erro quando prazo efetivo é menor que 12 meses após ajuste por idade', () => {
      // 80 anos = 960 meses → máximo = 966 - 960 = 6 meses → menor que 12
      expect(() => calculator.calculate({ ...BASE_INPUT, applicantAgeYears: 80, termMonths: 12 })).toThrow()
    })
  })

  describe('calculateEffectiveTerm', () => {
    it('retorna o prazo correto para proponente de 45 anos solicitando 35 anos', () => {
      // 45 × 12 = 540 meses → máximo por idade = 966 - 540 = 426 → limitado por prazo máximo 420
      const effective = calculator.calculateEffectiveTerm(45, 420)
      expect(effective).toBe(420)
    })

    it('retorna prazo limitado por idade para proponente de 50 anos', () => {
      // 50 × 12 = 600 → máximo = 966 - 600 = 366 < 420
      const effective = calculator.calculateEffectiveTerm(50, 420)
      expect(effective).toBe(366)
    })
  })
})
