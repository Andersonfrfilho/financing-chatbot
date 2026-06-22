import type { FinancingClient } from '@/infra/database/schema'

export type CreateClientInput = {
  whatsappNumber:   string
  personType?:      'pf' | 'pj'

  // Pessoa Física
  name?:                   string
  cpfEncrypted?:           string
  birthDate?:              string
  civilStatus?:            'single' | 'married' | 'divorced' | 'widowed' | 'stable_union'
  phone?:                  string
  email?:                  string
  city?:                   string
  state?:                  string
  monthlyIncomeEncrypted?: string

  // Co-participante
  hasCoParticipant?:             boolean
  coParticipantIncomeEncrypted?: string

  // Pessoa Jurídica
  companyName?:             string
  cnpjEncrypted?:           string
  responsibleName?:         string
  companyRevenueEncrypted?: string
}

export type UpdateClientInput = Partial<Omit<CreateClientInput, 'whatsappNumber'>>

export type ClientFilters = {
  search?: string
  city?:   string
  state?:  string
  page?:   number
  limit?:  number
}

export interface ClientRepository {
  findById(id: string): Promise<FinancingClient | null>
  findByWhatsappNumber(whatsappNumber: string): Promise<FinancingClient | null>
  findByCpf(cpf: string): Promise<FinancingClient | null>
  /** Reatribui o número de WhatsApp do cadastro com este CPF. Retorna false se o número já está em uso. */
  reassignWhatsapp(cpf: string, newWhatsapp: string): Promise<boolean>
  findAll(filters: ClientFilters): Promise<{ data: FinancingClient[]; total: number }>
  upsert(input: CreateClientInput): Promise<FinancingClient>
  update(id: string, input: UpdateClientInput): Promise<FinancingClient>
  softDelete(id: string): Promise<void>
}
