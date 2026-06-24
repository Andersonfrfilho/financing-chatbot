import type { FinancingSimulation } from '@/infra/database/schema'

export type SimulationFilters = {
  search?:        string
  financingType?: string
  startDate?:     string
  endDate?:       string
  page?:          number
  limit?:         number
}

export type SimulationListItem = Pick<FinancingSimulation, 'id' | 'financingType' | 'requestedAmount' | 'termMonths' | 'createdAt'> & {
  bankNames: string | null
}

export interface SimulationRepository {
  findAll(filters: SimulationFilters): Promise<{ data: SimulationListItem[]; total: number }>
}
