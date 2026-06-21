export interface SessionContext {
  // Dados pessoais
  name?: string
  cpf?: string
  birthDate?: string
  civilStatus?: string
  email?: string
  city?: string
  state?: string

  // Tipo de financiamento
  financingType?: string

  // Dados financeiros comuns
  monthlyIncome?: number
  familyIncome?: number

  // Imobiliário
  hasFgts?: boolean
  fgtsAmount?: number
  hasDownPayment?: boolean
  downPaymentAmount?: number
  propertyValue?: number
  propertyType?: string
  propertyCity?: string
  propertyState?: string

  // Veículo
  vehicleType?: string
  vehicleValue?: number
  vehicleYear?: number

  // Pessoal / Consignado
  loanAmount?: number
  employmentType?: string
  employer?: string

  // Empresa
  cnpj?: string
  companyRevenue?: number
  loanPurpose?: string

  // Prazo
  termMonths?: number

  // Resultado
  simulationId?: string
}

export type ConversationState =
  | 'greeting'
  | 'awaiting_financing_type'
  | 'awaiting_name'
  | 'awaiting_cpf'
  | 'awaiting_birth_date'
  | 'awaiting_civil_status'
  | 'awaiting_email'
  | 'awaiting_city'
  | 'awaiting_state'
  | 'awaiting_monthly_income'
  | 'awaiting_family_income'
  | 'awaiting_fgts'
  | 'awaiting_fgts_amount'
  | 'awaiting_down_payment'
  | 'awaiting_down_payment_amount'
  | 'awaiting_property_value'
  | 'awaiting_property_type'
  | 'awaiting_property_city'
  | 'awaiting_property_state'
  | 'awaiting_vehicle_type'
  | 'awaiting_vehicle_value'
  | 'awaiting_vehicle_year'
  | 'awaiting_vehicle_down_payment'
  | 'awaiting_loan_amount'
  | 'awaiting_employment_type'
  | 'awaiting_employer'
  | 'awaiting_company_cnpj'
  | 'awaiting_company_revenue'
  | 'awaiting_loan_purpose'
  | 'awaiting_term'
  | 'simulation_ready'
  | 'human_handoff'
  | 'completed'
  | 'abandoned'
