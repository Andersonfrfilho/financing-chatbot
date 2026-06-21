import type { Lead } from '@/infra/database/schema'

export type CreateLeadInput = {
  clientId: string
  simulationId?: string
  whatsappNumber: string
  assignedTo?: string
  notes?: string
}

export type UpdateLeadInput = {
  status?: string
  assignedTo?: string
  notes?: string
  simulationId?: string
}

export type LeadFilters = {
  status?: string
  assignedTo?: string
  financingType?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>
  findAll(filters: LeadFilters): Promise<{ data: Lead[]; total: number }>
  findByClientId(clientId: string): Promise<Lead[]>
  create(input: CreateLeadInput): Promise<Lead>
  update(id: string, input: UpdateLeadInput): Promise<Lead>
  countByStatus(): Promise<Record<string, number>>
}
