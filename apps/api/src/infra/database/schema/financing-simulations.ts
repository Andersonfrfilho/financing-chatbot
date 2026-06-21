import { pgTable, uuid, numeric, integer, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { financingClients } from './financing-clients'
import { financingTypeEnum, propertyTypeEnum, vehicleTypeEnum } from './enums'

export const financingSimulations = pgTable('financing_simulations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => financingClients.id, { onDelete: 'set null' }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
  sessionId: varchar('session_id', { length: 100 }),

  // Tipo de financiamento escolhido pelo usuário
  financingType: financingTypeEnum('financing_type').notNull(),

  // Valor solicitado (comum a todas as modalidades)
  requestedAmount: numeric('requested_amount', { precision: 15, scale: 2 }).notNull(),
  downPaymentAmount: numeric('down_payment_amount', { precision: 15, scale: 2 }).default('0').notNull(),
  financedAmount: numeric('financed_amount', { precision: 15, scale: 2 }).notNull(),
  termMonths: integer('term_months').notNull(),

  // Específico: imobiliário
  propertyValue: numeric('property_value', { precision: 15, scale: 2 }),
  propertyType: propertyTypeEnum('property_type'),
  propertyCity: varchar('property_city', { length: 100 }),
  propertyState: varchar('property_state', { length: 2 }),
  fgtsAmount: numeric('fgts_amount', { precision: 15, scale: 2 }).default('0').notNull(),

  // Específico: veículo
  vehicleType: vehicleTypeEnum('vehicle_type'),
  vehicleYear: integer('vehicle_year'),

  // Dados extras por modalidade (flexível)
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type FinancingSimulation = typeof financingSimulations.$inferSelect
export type NewFinancingSimulation = typeof financingSimulations.$inferInsert
