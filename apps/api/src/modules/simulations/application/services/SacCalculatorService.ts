export interface SacInput {
  financedAmount: number
  annualRate: number
  termMonths: number
}

export interface SacResult {
  system: 'SAC'
  firstInstallment: number
  lastInstallment: number
  totalInterest: number
  totalCost: number
  installments: SacInstallment[]
}

export interface SacInstallment {
  number: number
  balance: number
  amortization: number
  interest: number
  installment: number
}

export class SacCalculatorService {
  calculate(input: SacInput): SacResult {
    const { financedAmount, annualRate, termMonths } = input
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
    const amortization = financedAmount / termMonths

    const installments: SacInstallment[] = []
    let totalInterest = 0

    for (let month = 1; month <= termMonths; month++) {
      const balance = financedAmount - amortization * (month - 1)
      const interest = balance * monthlyRate
      const installment = amortization + interest

      totalInterest += interest
      installments.push({
        number: month,
        balance: this.round(balance),
        amortization: this.round(amortization),
        interest: this.round(interest),
        installment: this.round(installment),
      })
    }

    return {
      system: 'SAC',
      firstInstallment: this.round(installments[0]!.installment),
      lastInstallment: this.round(installments[termMonths - 1]!.installment),
      totalInterest: this.round(totalInterest),
      totalCost: this.round(financedAmount + totalInterest),
      installments,
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
