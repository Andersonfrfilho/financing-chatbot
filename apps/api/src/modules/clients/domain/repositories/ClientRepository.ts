import type { FinancingClient } from '@/infra/database/schema'

export type CreateClientInput = {
  whatsappNumber: string
  name: string
  cpfEncrypted: string
  birthDate?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  civilStatus?: string
  monthlyIncomeEncrypted?: string
  familyIncomeEncrypted?: string
  fgtsAmountEncrypted?: string
  downPaymentAmountEncrypted?: string
  lgpdConsentAt?: Date
}

export type UpdateClientInput = Partial<Omit<CreateClientInput, 'whatsappNumber' | 'cpfEncrypted'>>

export type ClientFilters = {
  search?: string
  city?: string
  state?: string
  page?: number
  limit?: number
}

export interface ClientRepository {
  findById(id: string): Promise<FinancingClient | null>
  findByWhatsappNumber(whatsappNumber: string): Promise<FinancingClient | null>
  findAll(filters: ClientFilters): Promise<{ data: FinancingClient[]; total: number }>
  create(input: CreateClientInput): Promise<FinancingClient>
  update(id: string, input: UpdateClientInput): Promise<FinancingClient>
  softDelete(id: string): Promise<void>
}
