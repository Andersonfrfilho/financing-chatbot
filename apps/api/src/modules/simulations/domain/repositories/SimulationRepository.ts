import type { FinancingSimulation } from '@/infra/database/schema'

export type SimulationFilters = {
  search?:           string
  financingType?:    string
  startDate?:        string
  endDate?:          string
  minFinanced?:      number
  maxFinanced?:      number
  minTermMonths?:    number
  maxTermMonths?:    number
  page?:             number
  limit?:            number
}

export type SimulationListItem = Pick<FinancingSimulation, 'id' | 'financingType' | 'requestedAmount' | 'termMonths' | 'createdAt'> & {
  financedAmount:    string | null
  downPaymentAmount: string | null
  whatsappNumber:    string | null
  clientName:        string | null
  bankNames:         string | null
  bestRateAnnual:    number | null
  banksCount:        number
}

export interface SimulationRepository {
  findAll(filters: SimulationFilters): Promise<{ data: SimulationListItem[]; total: number }>
}
