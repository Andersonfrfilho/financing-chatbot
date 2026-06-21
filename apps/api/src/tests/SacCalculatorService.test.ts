import { describe, it, expect } from 'bun:test'
import { SacCalculatorService } from '../modules/simulations/application/services/SacCalculatorService'

const sac = new SacCalculatorService()

describe('SacCalculatorService', () => {
  it('calcula parcela inicial corretamente', () => {
    // 300k financiado, 8% a.a., 360 meses
    const result = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const monthlyRate = Math.pow(1.08, 1 / 12) - 1
    const amortization = 300_000 / 360
    const expected = amortization + 300_000 * monthlyRate
    expect(result.firstInstallment).toBeCloseTo(expected, 0)
  })

  it('calcula parcela final corretamente', () => {
    const result = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const monthlyRate = Math.pow(1.08, 1 / 12) - 1
    const amortization = 300_000 / 360
    // última parcela: saldo = amortização (só 1 restante)
    const expected = amortization + amortization * monthlyRate
    expect(result.lastInstallment).toBeCloseTo(expected, 0)
  })

  it('primeira parcela é maior que a última (SAC é decrescente)', () => {
    const result = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(result.firstInstallment).toBeGreaterThan(result.lastInstallment)
  })

  it('retorna 360 parcelas', () => {
    const result = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(result.installments).toHaveLength(360)
  })

  it('custo total = valor financiado + total de juros', () => {
    const result = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(result.totalCost).toBeCloseTo(300_000 + result.totalInterest, 0)
  })

  it('funciona para financiamento curto (veículo 48 meses)', () => {
    const result = sac.calculate({ financedAmount: 50_000, annualRate: 0.14, termMonths: 48 })
    expect(result.firstInstallment).toBeGreaterThan(0)
    expect(result.installments).toHaveLength(48)
  })
})
