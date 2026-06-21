export type AmortizationSystem = 'SAC' | 'PRICE'

export type FinancingModality = 'SFH' | 'SFI' | 'FGTS' | 'CH' | 'CCFI'

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'disqualified'
  | 'negotiating'
  | 'proposal_sent'
  | 'won'
  | 'lost'

export interface JwtPayload {
  sub: string
  role: string
  permissions: Array<{ resource: string; action: string }>
  iat?: number
  exp?: number
}
