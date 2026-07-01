import { pgEnum } from 'drizzle-orm/pg-core'

export const personTypeEnum = pgEnum('person_type', ['pf', 'pj'])

export const civilStatusEnum = pgEnum('civil_status', [
  'single',
  'married',
  'divorced',
  'widowed',
  'stable_union',
])

export const sellerContextEnum = pgEnum('seller_context', [
  'dealer',        // loja / revendedora
  'dealership',    // concessionária
  'private',       // direto com o dono
])

export const vehicleFuelEnum = pgEnum('vehicle_fuel', [
  'flex', 'gasoline', 'diesel', 'electric', 'hybrid',
])

export const purchaseIntentEnum = pgEnum('purchase_intent', [
  'researching', 'buying',
])

export const realEstateObjectiveEnum = pgEnum('real_estate_objective', [
  'financing',    // financiamento de imóvel
  'home_equity',  // crédito com garantia
  'portability',  // portabilidade
])

export const purchaseTimelineEnum = pgEnum('purchase_timeline', [
  'immediate', '3m', '6m', '12m', 'researching',
])

export const employmentTypeEnum = pgEnum('employment_type', [
  'clt', 'public_servant', 'self_employed', 'business_owner', 'retired',
])

// Tipo principal de financiamento — o usuário escolhe no início do fluxo
export const financingTypeEnum = pgEnum('financing_type', [
  'imobiliario',    // Financiamento imobiliário (SFH, SFI, FGTS)
  'veiculo',        // Financiamento de veículos (CDC, leasing)
  'pessoal',        // Empréstimo pessoal / crédito pessoal
  'consignado',     // Crédito consignado (desconto em folha)
  'empresa',        // Capital de giro / financiamento para PJ
  'equipamento',    // Financiamento de máquinas e equipamentos
  'rural',          // Crédito rural / agronegócio
])

export const propertyTypeEnum = pgEnum('property_type', [
  'residential',
  'commercial',
  'land',
  'rural',
])

export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'car',
  'motorcycle',
  'truck',
  'other',
])

export const amortizationSystemEnum = pgEnum('amortization_system', ['SAC', 'PRICE', 'NAO_APLICAVEL'])

// Modalidade técnica do produto bancário (Open Finance)
export const financingModalityEnum = pgEnum('financing_modality', [
  // Imobiliário
  'SFH',
  'SFI',
  'FGTS',
  'MCMV',   // Minha Casa Minha Vida
  // Veículo
  'CDC',    // Crédito Direto ao Consumidor
  'LEASING',
  // Pessoal / Consignado
  'PESSOAL',
  'CONSIGNADO_PUBLICO',
  'CONSIGNADO_PRIVADO',
  'CONSIGNADO_INSS',
  // Empresa
  'CAPITAL_GIRO',
  'DESCONTO_DUPLICATAS',
  // Rural
  'RURAL',
  // Equipamento
  'FINAME',
])

export const rateSourceEnum = pgEnum('rate_source', ['open_finance', 'manual'])

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'qualified',
  'disqualified',
  'negotiating',
  'proposal_sent',
  'won',
  'lost',
])

export const catalogSyncStatusEnum = pgEnum('catalog_sync_status', ['pending', 'synced', 'error'])

export const productAvailabilityEnum = pgEnum('product_availability', [
  'in stock',
  'out of stock',
  'preorder',
  'available for order',
  'discontinued',
])

export const productConditionEnum = pgEnum('product_condition', ['new', 'refurbished', 'used'])

export const conversationStateEnum = pgEnum('conversation_state', [
  // Início
  'greeting',
  'awaiting_financing_type',  // usuário escolhe a modalidade
  // Tipo de pessoa
  'awaiting_person_type',
  // Dados pessoais
  'awaiting_name',
  'awaiting_cpf',
  'awaiting_birth_date',
  'awaiting_civil_status',
  'awaiting_email',
  'awaiting_city',
  'awaiting_state',
  // Dados financeiros
  'awaiting_monthly_income',
  'awaiting_family_income',
  // Específico: imobiliário
  'awaiting_fgts',
  'awaiting_fgts_amount',
  'awaiting_down_payment',
  'awaiting_down_payment_amount',
  'awaiting_property_value',
  'awaiting_property_type',
  'awaiting_property_city',
  'awaiting_property_state',
  // Específico: veículo
  'awaiting_vehicle_type',
  'awaiting_vehicle_value',
  'awaiting_vehicle_year',
  'awaiting_vehicle_down_payment',
  // Específico: pessoal / consignado
  'awaiting_loan_amount',
  'awaiting_employment_type',
  'awaiting_employer',
  // Específico: empresa
  'awaiting_company_cnpj',
  'awaiting_company_revenue',
  'awaiting_loan_purpose',
  // Seleção de prazo (comum a todos)
  'awaiting_term',
  // Resultado
  'simulation_ready',
  'human_handoff',
  'completed',
  'abandoned',
])
