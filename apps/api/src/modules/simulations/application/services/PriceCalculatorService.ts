export interface PriceInput {
  financedAmount: number
  annualRate: number
  termMonths: number
}

export interface PriceResult {
  system: 'PRICE'
  fixedInstallment: number
  totalInterest: number
  totalCost: number
  installments: PriceInstallment[]
}

export interface PriceInstallment {
  number: number
  balance: number
  amortization: number
  interest: number
  installment: number
}

export class PriceCalculatorService {
  calculate(input: PriceInput): PriceResult {
    const { financedAmount, annualRate, termMonths } = input
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1

    // PMT = PV × i / (1 − (1 + i)^(−n))
    const fixedInstallment =
      (financedAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))

    const installments: PriceInstallment[] = []
    let balance = financedAmount
    let totalInterest = 0

    for (let month = 1; month <= termMonths; month++) {
      const interest = balance * monthlyRate
      const amortization = fixedInstallment - interest
      balance -= amortization
      totalInterest += interest

      installments.push({
        number: month,
        balance: this.round(Math.max(balance, 0)),
        amortization: this.round(amortization),
        interest: this.round(interest),
        installment: this.round(fixedInstallment),
      })
    }

    return {
      system: 'PRICE',
      fixedInstallment: this.round(fixedInstallment),
      totalInterest: this.round(totalInterest),
      totalCost: this.round(financedAmount + totalInterest),
      installments,
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
