import { describe, it, expect } from 'bun:test'
import { PriceCalculatorService } from '../modules/simulations/application/services/PriceCalculatorService'
import { SacCalculatorService } from '../modules/simulations/application/services/SacCalculatorService'

const price = new PriceCalculatorService()
const sac = new SacCalculatorService()

describe('PriceCalculatorService', () => {
  it('calcula parcela fixa (PMT) corretamente', () => {
    // 300k, 8% a.a., 360 meses
    const result = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const i = Math.pow(1.08, 1 / 12) - 1
    const expectedPmt = (300_000 * i) / (1 - Math.pow(1 + i, -360))
    expect(result.fixedInstallment).toBeCloseTo(expectedPmt, 0)
  })

  it('todas as parcelas têm o mesmo valor (PRICE é constante)', () => {
    const result = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const first = result.installments[0]!.installment
    const last = result.installments[359]!.installment
    expect(Math.abs(first - last)).toBeLessThan(0.01)
  })

  it('retorna 360 parcelas', () => {
    const result = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(result.installments).toHaveLength(360)
  })

  it('custo total = valor financiado + total de juros', () => {
    const result = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(result.totalCost).toBeCloseTo(300_000 + result.totalInterest, 0)
  })

  it('saldo devedor chega próximo a zero no final', () => {
    const result = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const lastBalance = result.installments[359]!.balance
    expect(lastBalance).toBeLessThan(1) // tolerância de R$1
  })

  it('PRICE tem total de juros maior que SAC (mais caro a longo prazo)', () => {
    const resultPrice = price.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    const resultSac = sac.calculate({ financedAmount: 300_000, annualRate: 0.08, termMonths: 360 })
    expect(resultPrice.totalInterest).toBeGreaterThan(resultSac.totalInterest)
  })

  it('funciona para consignado (24 meses)', () => {
    const result = price.calculate({ financedAmount: 10_000, annualRate: 0.145, termMonths: 24 })
    expect(result.fixedInstallment).toBeGreaterThan(0)
    expect(result.installments).toHaveLength(24)
  })
})
