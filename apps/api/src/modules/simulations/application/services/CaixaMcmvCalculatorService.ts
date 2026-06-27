const DFI_MONTHLY_RATE = 0.000066
const TAC_AMOUNT = 25.00
const MAXIMUM_TERM_MONTHS = 420
const MAXIMUM_TOTAL_AGE_MONTHS = 966

interface McmvFaixa {
  number: number
  maximumMonthlyIncome: number
  maximumPropertyValue: number
  annualRate: number
}

const MCMV_FAIXAS: McmvFaixa[] = [
  { number: 1,  maximumMonthlyIncome: 2_160,    maximumPropertyValue: 210_000,    annualRate: 0.048548 },
  { number: 2,  maximumMonthlyIncome: 2_850,    maximumPropertyValue: 210_000,    annualRate: 0.051162 },
  { number: 3,  maximumMonthlyIncome: 3_200,    maximumPropertyValue: 210_000,    annualRate: 0.053782 },
  { number: 4,  maximumMonthlyIncome: 3_500,    maximumPropertyValue: 210_000,    annualRate: 0.056408 },
  { number: 5,  maximumMonthlyIncome: 4_000,    maximumPropertyValue: 210_000,    annualRate: 0.061678 },
  { number: 6,  maximumMonthlyIncome: 5_000,    maximumPropertyValue: 210_000,    annualRate: 0.072290 },
  { number: 7,  maximumMonthlyIncome: 9_600,    maximumPropertyValue: 400_000,    annualRate: 0.084722 },
  { number: 8,  maximumMonthlyIncome: 13_000,   maximumPropertyValue: 600_000,    annualRate: 0.104700 },
  { number: 9,  maximumMonthlyIncome: 77_500,   maximumPropertyValue: 2_250_000,  annualRate: 0.114900 },
  { number: 10, maximumMonthlyIncome: Infinity, maximumPropertyValue: Infinity,   annualRate: 0.134000 },
]

interface MipBracket {
  minimumAge: number
  maximumAge: number
  monthlyRate: number
}

// Source: simuladorhabitacao.caixa.gov.br Angular bundle v1.15.12.0 (08/06/2026)
const MIP_BRACKETS: MipBracket[] = [
  { minimumAge: 18, maximumAge: 25, monthlyRate: 0.000093 },
  { minimumAge: 26, maximumAge: 30, monthlyRate: 0.000096 },
  { minimumAge: 31, maximumAge: 35, monthlyRate: 0.000116 },
  { minimumAge: 36, maximumAge: 40, monthlyRate: 0.000154 },
  { minimumAge: 41, maximumAge: 45, monthlyRate: 0.000252 },
  { minimumAge: 46, maximumAge: 50, monthlyRate: 0.000386 },
  { minimumAge: 51, maximumAge: 55, monthlyRate: 0.000676 },
  { minimumAge: 56, maximumAge: 60, monthlyRate: 0.001533 },
  { minimumAge: 61, maximumAge: 65, monthlyRate: 0.002731 },
  { minimumAge: 66, maximumAge: 70, monthlyRate: 0.003259 },
  { minimumAge: 71, maximumAge: 75, monthlyRate: 0.004894 },
  { minimumAge: 76, maximumAge: 80, monthlyRate: 0.005312 },
]

export interface CaixaMcmvInput {
  propertyValue: number
  financedAmount: number
  termMonths: number
  familyMonthlyIncome: number
  applicantAgeYears: number
}

export interface CaixaMcmvInstallmentBreakdown {
  amortization: number
  interest: number
  mip: number
  dfi: number
  tac: number
}

export interface CaixaMcmvResult {
  system: 'SAC'
  mcmvFaixa: number
  annualRate: number
  effectiveTermMonths: number
  firstInstallment: number
  lastInstallment: number
  firstInstallmentBreakdown: CaixaMcmvInstallmentBreakdown
  totalInterest: number
  totalMip: number
  totalDfi: number
  tac: number
  totalCost: number
  incomeCommitmentPercent: number
}

export class CaixaMcmvCalculatorService {
  calculate(input: CaixaMcmvInput): CaixaMcmvResult {
    const { propertyValue, financedAmount, familyMonthlyIncome, applicantAgeYears } = input

    if (financedAmount <= 0) throw new Error('Valor financiado deve ser maior que zero')
    if (familyMonthlyIncome <= 0) throw new Error('Renda familiar deve ser maior que zero')
    if (applicantAgeYears < 18) throw new Error('Caixa: idade mínima do proponente é 18 anos')
    if (applicantAgeYears >= 80.5) throw new Error('Caixa: prazo + idade não pode exceder 80 anos e 6 meses')

    const faixa = this.findFaixa(familyMonthlyIncome, propertyValue)
    const effectiveTermMonths = this.calculateEffectiveTerm(applicantAgeYears, input.termMonths)

    if (effectiveTermMonths < 12) {
      throw new Error('Prazo insuficiente para financiamento após ajuste por idade')
    }

    const monthlyRate = Math.pow(1 + faixa.annualRate, 1 / 12) - 1
    const mipMonthlyRate = this.getMipMonthlyRate(applicantAgeYears)
    const dfiMonthlyAmount = propertyValue * DFI_MONTHLY_RATE
    const amortization = financedAmount / effectiveTermMonths

    let totalInterest = 0
    let totalMip = 0
    let totalDfi = 0
    let firstInstallment = 0
    let lastInstallment = 0
    let firstInstallmentBreakdown: CaixaMcmvInstallmentBreakdown = {
      amortization: 0, interest: 0, mip: 0, dfi: 0, tac: 0,
    }

    for (let month = 1; month <= effectiveTermMonths; month++) {
      const outstandingBalance = financedAmount - amortization * (month - 1)
      const interest = outstandingBalance * monthlyRate
      const mip = outstandingBalance * mipMonthlyRate
      const tac = month === 1 ? TAC_AMOUNT : 0
      const installment = amortization + interest + mip + dfiMonthlyAmount + tac

      totalInterest += interest
      totalMip += mip
      totalDfi += dfiMonthlyAmount

      if (month === 1) {
        firstInstallment = this.round(installment)
        firstInstallmentBreakdown = {
          amortization: this.round(amortization),
          interest: this.round(interest),
          mip: this.round(mip),
          dfi: this.round(dfiMonthlyAmount),
          tac: TAC_AMOUNT,
        }
      }

      if (month === effectiveTermMonths) {
        lastInstallment = this.round(amortization + interest + mip + dfiMonthlyAmount)
      }
    }

    const totalCost = financedAmount + totalInterest + totalMip + totalDfi + TAC_AMOUNT
    const incomeCommitmentPercent = (firstInstallment / familyMonthlyIncome) * 100

    return {
      system: 'SAC',
      mcmvFaixa: faixa.number,
      annualRate: faixa.annualRate,
      effectiveTermMonths,
      firstInstallment,
      lastInstallment,
      firstInstallmentBreakdown,
      totalInterest: this.round(totalInterest),
      totalMip: this.round(totalMip),
      totalDfi: this.round(totalDfi),
      tac: TAC_AMOUNT,
      totalCost: this.round(totalCost),
      incomeCommitmentPercent: this.round(incomeCommitmentPercent),
    }
  }

  // Retorna a menor faixa que satisfaz AMBAS as condições: renda E valor do imóvel.
  findFaixa(familyMonthlyIncome: number, propertyValue: number): McmvFaixa {
    for (const faixa of MCMV_FAIXAS) {
      if (familyMonthlyIncome <= faixa.maximumMonthlyIncome && propertyValue <= faixa.maximumPropertyValue) {
        return faixa
      }
    }
    return MCMV_FAIXAS[MCMV_FAIXAS.length - 1]!
  }

  getMipMonthlyRate(applicantAgeYears: number): number {
    const age = Math.floor(applicantAgeYears)
    for (const bracket of MIP_BRACKETS) {
      if (age >= bracket.minimumAge && age <= bracket.maximumAge) {
        return bracket.monthlyRate
      }
    }
    return MIP_BRACKETS[MIP_BRACKETS.length - 1]!.monthlyRate
  }

  calculateEffectiveTerm(applicantAgeYears: number, requestedTermMonths: number): number {
    const applicantAgeMonths = Math.floor(applicantAgeYears) * 12
    const maximumTermByAge = MAXIMUM_TOTAL_AGE_MONTHS - applicantAgeMonths
    return Math.min(requestedTermMonths, MAXIMUM_TERM_MONTHS, maximumTermByAge)
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
