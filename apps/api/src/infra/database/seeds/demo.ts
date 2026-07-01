/**
 * Demo seed — ~250 registros cobrindo todos os casos possíveis.
 * Executar manualmente: bun run db:seed:demo
 */

import { db } from '../connection'
import * as schema from '../schema'
import { eq, inArray } from 'drizzle-orm'
import { hash } from '@node-rs/argon2'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function hoursAgo(hours: number): Date {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Maria', 'Natan', 'Olivia', 'Paulo',
  'Quezia', 'Rafael', 'Sabrina', 'Thiago', 'Ursula', 'Vinícius', 'Wesley',
  'Ximena', 'Yasmin', 'Zélia', 'Adriana', 'Bernardo', 'Camila', 'Daniel',
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
]

const CITIES_BY_STATE: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'Sorocaba'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Petrópolis', 'Volta Redonda'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Cascavel'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'Chapecó'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis'],
  DF: ['Brasília', 'Taguatinga', 'Ceilândia'],
}

const STATES = Object.keys(CITIES_BY_STATE) as string[]

const EMPLOYERS = [
  'Petrobras', 'Embraer', 'Vale', 'Bradesco', 'Itaú', 'Ambev',
  'Magazine Luiza', 'Natura', 'Totvs', 'WEG', 'Localiza', 'Cyrela',
  'Governo Federal', 'Prefeitura Municipal', 'Secretaria de Saúde',
]

const COMPANY_NAMES = [
  'Tech Solutions Ltda', 'Construções Modernas SA', 'Agro Fértil Ltda',
  'Transportes Rápidos ME', 'Distribuidora Sul Ltda', 'Padaria do Centro ME',
  'Consultoria Fiscal SA', 'Metalúrgica Norte Ltda', 'Farmácia Popular ME',
]

const VEHICLE_BRANDS = ['Toyota', 'Volkswagen', 'Fiat', 'Chevrolet', 'Honda', 'Hyundai', 'Ford', 'Renault']
const VEHICLE_MODELS: Record<string, string[]> = {
  Toyota: ['Corolla', 'Hilux', 'Yaris', 'SW4'],
  Volkswagen: ['Gol', 'Polo', 'T-Cross', 'Virtus'],
  Fiat: ['Uno', 'Toro', 'Cronos', 'Pulse'],
  Chevrolet: ['Onix', 'S10', 'Tracker', 'Montana'],
  Honda: ['Civic', 'HR-V', 'City', 'Fit'],
  Hyundai: ['HB20', 'Creta', 'Tucson', 'Santa Fe'],
  Ford: ['Ka', 'Ranger', 'Territory', 'Bronco Sport'],
  Renault: ['Kwid', 'Duster', 'Logan', 'Sandero'],
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemo() {
  console.log('[Demo Seed] Starting...')

  // -----------------------------------------------------------------------
  // 1. Extra users (5 users across roles)
  // -----------------------------------------------------------------------
  const [comercialRole, atendimentoRole] = await Promise.all([
    db.query.roles.findFirst({ where: eq(schema.roles.name, 'comercial') }),
    db.query.roles.findFirst({ where: eq(schema.roles.name, 'atendimento') }),
  ])

  const passwordHash = await hash('demo@123')

  if (comercialRole && atendimentoRole) {
    await db.insert(schema.users).values([
      { roleId: comercialRole.id, name: 'Carlos Vendedor', email: 'carlos@financiamento.bot', passwordHash, active: true },
      { roleId: comercialRole.id, name: 'Fernanda Comercial', email: 'fernanda@financiamento.bot', passwordHash, active: true },
      { roleId: atendimentoRole.id, name: 'Juliana Suporte', email: 'juliana@financiamento.bot', passwordHash, active: true },
      { roleId: atendimentoRole.id, name: 'Marcos Atendimento', email: 'marcos@financiamento.bot', passwordHash, active: false },
    ]).onConflictDoNothing()
  }

  const allUsers = await db.query.users.findMany()

  // -----------------------------------------------------------------------
  // 2. Bank rates for all banks and modalities
  // -----------------------------------------------------------------------
  const allBanks = await db.query.banks.findMany({ where: eq(schema.banks.active, true) })

  const MODALITY_RATE_MAP: Array<{
    modality: schema.NewBankRate['modality']
    rateMin: number
    rateMax: number
    minTerm: number
    maxTerm: number
    maxLtv: number
  }> = [
    { modality: 'SFH',                rateMin: 8.99,  rateMax: 12.5,  minTerm: 60,  maxTerm: 360, maxLtv: 0.8 },
    { modality: 'SFI',                rateMin: 10.5,  rateMax: 14.0,  minTerm: 60,  maxTerm: 360, maxLtv: 0.7 },
    { modality: 'FGTS',               rateMin: 5.0,   rateMax: 8.16,  minTerm: 60,  maxTerm: 360, maxLtv: 0.9 },
    { modality: 'MCMV',               rateMin: 4.0,   rateMax: 7.66,  minTerm: 120, maxTerm: 360, maxLtv: 0.9 },
    { modality: 'CDC',                rateMin: 1.49,  rateMax: 2.5,   minTerm: 12,  maxTerm: 60,  maxLtv: 0.8 },
    { modality: 'LEASING',            rateMin: 1.29,  rateMax: 2.2,   minTerm: 24,  maxTerm: 48,  maxLtv: 0.75 },
    { modality: 'PESSOAL',            rateMin: 2.5,   rateMax: 6.9,   minTerm: 6,   maxTerm: 84,  maxLtv: 1.0 },
    { modality: 'CONSIGNADO_PUBLICO', rateMin: 1.5,   rateMax: 2.14,  minTerm: 12,  maxTerm: 96,  maxLtv: 1.0 },
    { modality: 'CONSIGNADO_PRIVADO', rateMin: 1.8,   rateMax: 2.5,   minTerm: 12,  maxTerm: 84,  maxLtv: 1.0 },
    { modality: 'CONSIGNADO_INSS',    rateMin: 1.45,  rateMax: 1.97,  minTerm: 12,  maxTerm: 84,  maxLtv: 1.0 },
    { modality: 'CAPITAL_GIRO',       rateMin: 1.9,   rateMax: 4.5,   minTerm: 6,   maxTerm: 36,  maxLtv: 1.0 },
    { modality: 'DESCONTO_DUPLICATAS',rateMin: 1.2,   rateMax: 3.0,   minTerm: 1,   maxTerm: 12,  maxLtv: 0.9 },
    { modality: 'RURAL',              rateMin: 6.0,   rateMax: 11.0,  minTerm: 12,  maxTerm: 120, maxLtv: 0.7 },
    { modality: 'FINAME',             rateMin: 7.5,   rateMax: 13.0,  minTerm: 12,  maxTerm: 120, maxLtv: 0.8 },
  ]

  const rateRows: schema.NewBankRate[] = []
  for (const bank of allBanks) {
    for (const modalityConfig of MODALITY_RATE_MAP) {
      const rateAnnual = (modalityConfig.rateMin + Math.random() * (modalityConfig.rateMax - modalityConfig.rateMin)).toFixed(6)
      rateRows.push({
        bankId: bank.id,
        modality: modalityConfig.modality,
        rateAnnual,
        referentialRateIndexer: '0',
        minTermMonths: modalityConfig.minTerm,
        maxTermMonths: modalityConfig.maxTerm,
        maxLtv: modalityConfig.maxLtv.toFixed(4),
        effectiveDate: '2025-01-01',
        source: 'manual',
      })
    }
  }
  await db.insert(schema.bankRates).values(rateRows).onConflictDoNothing()
  console.log(`[Demo Seed] Bank rates: ${rateRows.length} records`)

  // -----------------------------------------------------------------------
  // 3. Financing clients — 50 PF + 10 PJ
  // -----------------------------------------------------------------------
  const CIVIL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'stable_union'] as const
  const clientRows: schema.NewFinancingClient[] = []

  // 50 PF clients
  for (let index = 0; index < 50; index++) {
    const state = pick(STATES)
    const city = pick(CITIES_BY_STATE[state]!)
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const phone = `5511${String(randomBetween(900000000, 999999999))}`
    clientRows.push({
      whatsappNumber: `551199${String(index).padStart(7, '0')}`,
      personType: 'pf',
      name: `${firstName} ${lastName}`,
      birthDate: `${randomBetween(1960, 2000)}-${String(randomBetween(1, 12)).padStart(2, '0')}-${String(randomBetween(1, 28)).padStart(2, '0')}`,
      civilStatus: pick(CIVIL_STATUSES),
      phone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@email.com`,
      city,
      state,
      hasCoParticipant: index % 5 === 0,
    })
  }

  // 10 PJ clients
  for (let index = 0; index < 10; index++) {
    const state = pick(STATES)
    const city = pick(CITIES_BY_STATE[state]!)
    const responsibleFirst = pick(FIRST_NAMES)
    const responsibleLast = pick(LAST_NAMES)
    clientRows.push({
      whatsappNumber: `551198${String(index).padStart(7, '0')}`,
      personType: 'pj',
      name: pick(COMPANY_NAMES),
      city,
      state,
      responsibleName: `${responsibleFirst} ${responsibleLast}`,
      hasCoParticipant: false,
    })
  }

  const insertedClients = await db.insert(schema.financingClients).values(clientRows).onConflictDoNothing().returning()
  console.log(`[Demo Seed] Clients: ${insertedClients.length} records`)

  const clients = await db.query.financingClients.findMany()

  // -----------------------------------------------------------------------
  // 4. Financing simulations — all 7 types, ~10 each = 70 total
  // -----------------------------------------------------------------------
  const FINANCING_TYPES = ['imobiliario', 'veiculo', 'pessoal', 'consignado', 'empresa', 'equipamento', 'rural'] as const
  const PROPERTY_TYPES = ['residential', 'commercial', 'land', 'rural'] as const
  const VEHICLE_TYPES = ['car', 'motorcycle', 'truck', 'other'] as const
  const VEHICLE_FUELS = ['flex', 'gasoline', 'diesel', 'electric', 'hybrid'] as const
  const SELLER_CONTEXTS = ['dealer', 'dealership', 'private'] as const
  const PURCHASE_INTENTS = ['researching', 'buying'] as const
  const REAL_ESTATE_OBJECTIVES = ['financing', 'home_equity', 'portability'] as const
  const PURCHASE_TIMELINES = ['immediate', '3m', '6m', '12m', 'researching'] as const
  const EMPLOYMENT_TYPES = ['clt', 'public_servant', 'self_employed', 'business_owner', 'retired'] as const

  const simulationRows: schema.NewFinancingSimulation[] = []

  for (const financingType of FINANCING_TYPES) {
    for (let index = 0; index < 10; index++) {
      const client = clients[randomBetween(0, clients.length - 1)]!
      const state = pick(STATES)
      const city = pick(CITIES_BY_STATE[state]!)

      const baseRow: schema.NewFinancingSimulation = {
        clientId: client.id,
        whatsappNumber: client.whatsappNumber,
        financingType,
        requestedAmount: String(randomBetween(50000, 2000000)),
        downPaymentAmount: '0',
        financedAmount: String(randomBetween(40000, 1800000)),
        termMonths: pick([36, 48, 60, 120, 180, 240, 360]),
        fgtsAmount: '0',
        metadata: {},
      }

      if (financingType === 'imobiliario') {
        const propertyValue = randomBetween(200000, 3000000)
        const downPayment = Math.floor(propertyValue * 0.2)
        Object.assign(baseRow, {
          requestedAmount: String(propertyValue),
          downPaymentAmount: String(downPayment),
          financedAmount: String(propertyValue - downPayment),
          propertyValue: String(propertyValue),
          propertyType: pick(PROPERTY_TYPES),
          propertyCity: city,
          propertyState: state,
          realEstateObjective: pick(REAL_ESTATE_OBJECTIVES),
          purchaseTimeline: pick(PURCHASE_TIMELINES),
          fgtsAmount: index % 3 === 0 ? String(randomBetween(5000, 80000)) : '0',
          includeFees: index % 2 === 0,
          employmentType: pick(EMPLOYMENT_TYPES),
          employer: pick(EMPLOYERS),
        })
      } else if (financingType === 'veiculo') {
        const vehicleBrand = pick(VEHICLE_BRANDS)
        const vehicleValue = randomBetween(30000, 350000)
        const downPayment = Math.floor(vehicleValue * 0.3)
        Object.assign(baseRow, {
          requestedAmount: String(vehicleValue),
          downPaymentAmount: String(downPayment),
          financedAmount: String(vehicleValue - downPayment),
          termMonths: pick([12, 24, 36, 48, 60]),
          vehicleType: pick(VEHICLE_TYPES),
          vehicleBrand,
          vehicleModel: pick(VEHICLE_MODELS[vehicleBrand]!),
          vehicleYear: randomBetween(2015, 2025),
          vehicleFuel: pick(VEHICLE_FUELS),
          sellerContext: pick(SELLER_CONTEXTS),
          purchaseIntent: pick(PURCHASE_INTENTS),
          hasCnh: true,
          residenceState: state,
        })
      } else if (financingType === 'pessoal') {
        const amount = randomBetween(5000, 80000)
        Object.assign(baseRow, {
          requestedAmount: String(amount),
          financedAmount: String(amount),
          termMonths: pick([12, 24, 36, 48]),
          loanPurpose: pick(['reforma', 'viagem', 'educação', 'saúde', 'casamento', 'capital de giro pessoal']),
          employmentType: pick(EMPLOYMENT_TYPES),
        })
      } else if (financingType === 'consignado') {
        const amount = randomBetween(5000, 150000)
        Object.assign(baseRow, {
          requestedAmount: String(amount),
          financedAmount: String(amount),
          termMonths: pick([24, 36, 48, 60, 72, 84]),
          employmentType: pick(['clt', 'public_servant', 'retired'] as const),
          employer: pick(EMPLOYERS),
        })
      } else if (financingType === 'empresa') {
        const amount = randomBetween(50000, 2000000)
        Object.assign(baseRow, {
          requestedAmount: String(amount),
          financedAmount: String(amount),
          termMonths: pick([12, 24, 36]),
          loanPurpose: pick(['capital de giro', 'expansão', 'estoques', 'equipamentos']),
        })
      } else if (financingType === 'equipamento') {
        const amount = randomBetween(30000, 500000)
        Object.assign(baseRow, {
          requestedAmount: String(amount),
          financedAmount: String(amount),
          termMonths: pick([24, 36, 48, 60]),
          loanPurpose: pick(['máquinas industriais', 'equipamentos agrícolas', 'frota', 'tecnologia']),
        })
      } else if (financingType === 'rural') {
        const amount = randomBetween(20000, 800000)
        Object.assign(baseRow, {
          requestedAmount: String(amount),
          financedAmount: String(amount),
          termMonths: pick([12, 24, 36, 60]),
          loanPurpose: pick(['custeio agrícola', 'pecuária', 'irrigação', 'armazenagem']),
          propertyState: state,
        })
      }

      simulationRows.push(baseRow)
    }
  }

  const insertedSimulations = await db.insert(schema.financingSimulations).values(simulationRows).onConflictDoNothing().returning()
  console.log(`[Demo Seed] Simulations: ${insertedSimulations.length} records`)

  // -----------------------------------------------------------------------
  // 5. Simulation results — 2 per simulation × 70 = 140 results
  // -----------------------------------------------------------------------
  const bankRatesList = await db.query.bankRates.findMany()
  const AMORTIZATION_SYSTEMS = ['SAC', 'PRICE'] as const

  const resultRows: schema.NewSimulationResult[] = []
  for (const simulation of insertedSimulations) {
    const availableBanks = allBanks.slice(0, randomBetween(2, 4))
    for (const bank of availableBanks) {
      const amortization = pick(AMORTIZATION_SYSTEMS)
      const financed = Number(simulation.financedAmount)
      const termMonths = simulation.termMonths
      const rate = 0.01 + Math.random() * 0.009

      const firstInstallment = (financed * rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1)
      const lastInstallment = amortization === 'SAC' ? firstInstallment * 0.6 : firstInstallment
      const totalCost = amortization === 'SAC'
        ? firstInstallment * termMonths * 0.8
        : firstInstallment * termMonths
      const totalInterest = totalCost - financed
      const cetAnnual = (rate * 12 * 1.05).toFixed(6)

      const bankRate = bankRatesList.find((rate) => rate.bankId === bank.id)

      resultRows.push({
        simulationId: simulation.id,
        bankId: bank.id,
        bankRateId: bankRate?.id ?? null,
        amortizationSystem: amortization,
        firstInstallment: firstInstallment.toFixed(2),
        lastInstallment: amortization === 'SAC' ? lastInstallment.toFixed(2) : null,
        fixedInstallment: amortization === 'PRICE' ? firstInstallment.toFixed(2) : null,
        totalInterest: Math.max(0, totalInterest).toFixed(2),
        totalCost: totalCost.toFixed(2),
        cetAnnual,
      })
    }
  }
  const insertedResults = await db.insert(schema.simulationResults).values(resultRows).onConflictDoNothing().returning()
  console.log(`[Demo Seed] Simulation results: ${insertedResults.length} records`)

  // -----------------------------------------------------------------------
  // 6. Leads — todos os statuses, todos os tipos de financiamento = 70 leads
  // -----------------------------------------------------------------------
  const LEAD_STATUSES = ['new', 'qualified', 'disqualified', 'negotiating', 'proposal_sent', 'won', 'lost'] as const
  const leadRows: schema.NewLead[] = []

  for (let index = 0; index < insertedSimulations.length; index++) {
    const simulation = insertedSimulations[index]!
    const client = await db.query.financingClients.findFirst({
      where: eq(schema.financingClients.id, simulation.clientId!),
    })

    const status = LEAD_STATUSES[index % LEAD_STATUSES.length]!
    const assignedUser = index % 3 === 0 ? allUsers[randomBetween(0, allUsers.length - 1)] : undefined

    const notesByStatus: Record<string, string> = {
      new: 'Lead recém-chegado, aguardando triagem.',
      qualified: 'Cliente qualificado, renda compatível com o financiamento solicitado.',
      disqualified: 'Score de crédito insuficiente para o valor solicitado.',
      negotiating: 'Em negociação ativa. Proposta sendo ajustada conforme necessidade do cliente.',
      proposal_sent: 'Proposta enviada por e-mail. Aguardando retorno em 3 dias úteis.',
      won: 'Contrato assinado. Financiamento aprovado pela Caixa.',
      lost: 'Cliente optou por financiamento direto com construtora.',
    }

    leadRows.push({
      clientId: client?.id ?? null,
      simulationId: simulation.id,
      whatsappNumber: simulation.whatsappNumber,
      status,
      assignedTo: assignedUser?.id ?? null,
      notes: notesByStatus[status],
      createdAt: daysAgo(randomBetween(1, 90)),
      updatedAt: daysAgo(randomBetween(0, 30)),
    })
  }

  const insertedLeads = await db.insert(schema.leads).values(leadRows).onConflictDoNothing().returning()
  console.log(`[Demo Seed] Leads: ${insertedLeads.length} records`)

  // -----------------------------------------------------------------------
  // 7. Conversation sessions — 60 sessões em estados variados
  // -----------------------------------------------------------------------
  const CONVERSATION_STATES = [
    'greeting', 'awaiting_name', 'awaiting_cpf', 'awaiting_birth_date',
    'awaiting_civil_status', 'awaiting_monthly_income', 'awaiting_property_value',
    'awaiting_vehicle_value', 'awaiting_loan_amount', 'awaiting_employment_type',
    'awaiting_term', 'simulation_ready', 'human_handoff', 'completed', 'abandoned',
  ] as const

  const sessionRows: schema.NewConversationSession[] = []

  for (let index = 0; index < 60; index++) {
    const state = pick(STATES)
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const conversationState = CONVERSATION_STATES[index % CONVERSATION_STATES.length]!

    // Varia o tempo de última atividade para cobrir todos os cenários da UI:
    // - ativas recentes (< 1h), em andamento (1-12h), travadas (> 12h), antigas (> 24h)
    const lastActivityScenarios = [
      hoursAgo(0.1),   // ativa agora
      hoursAgo(0.5),   // 30 min
      hoursAgo(2),     // 2h — pode estar travada
      hoursAgo(6),     // 6h
      hoursAgo(13),    // travada (> 12h)
      hoursAgo(24),    // 1 dia
      daysAgo(3),      // 3 dias
      daysAgo(7),      // 1 semana
    ]
    const lastActivity = lastActivityScenarios[index % lastActivityScenarios.length]!

    const isHumanMode = index % 5 === 0
    const assignedUser = isHumanMode ? allUsers[randomBetween(0, allUsers.length - 1)] : undefined

    sessionRows.push({
      whatsappNumber: `5511${String(90000 + index).padStart(9, '0')}`,
      currentState: conversationState,
      context: {
        name: `${firstName} ${lastName}`,
        city: pick(CITIES_BY_STATE[state]!),
        state,
        financingType: pick(['imobiliario', 'veiculo', 'pessoal']),
        step: index,
      },
      mode: isHumanMode ? 'human' : 'bot',
      assignedUserId: assignedUser?.id ?? null,
      humanRequestedAt: isHumanMode ? daysAgo(randomBetween(0, 5)) : null,
      lastInboundAt: lastActivity,
      lastAgentReadAt: index % 4 === 0 ? hoursAgo(randomBetween(1, 48)) : null,
      lastActivity,
      createdAt: daysAgo(randomBetween(1, 30)),
      updatedAt: lastActivity,
    })
  }

  const insertedSessions = await db.insert(schema.conversationSessions).values(sessionRows).onConflictDoNothing().returning()
  console.log(`[Demo Seed] Conversation sessions: ${insertedSessions.length} records`)

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const totalRecords =
    insertedClients.length +
    insertedSimulations.length +
    insertedResults.length +
    insertedLeads.length +
    insertedSessions.length +
    rateRows.length

  console.log(`\n[Demo Seed] Done! Total records inserted: ${totalRecords}`)
  console.log('[Demo Seed] Users (demo): carlos@financiamento.bot / fernanda@financiamento.bot / juliana@financiamento.bot → senha: demo@123')
}

// Executar diretamente se chamado como script
if (import.meta.url.endsWith('seeds/demo.ts') || process.argv[1]?.endsWith('seeds/demo.ts')) {
  seedDemo()
    .catch((error) => {
      console.error('[Demo Seed] Failed:', error)
      process.exit(1)
    })
    .finally(() => process.exit(0))
}

export { seedDemo }
