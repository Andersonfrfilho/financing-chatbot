import { pgTable, uuid, numeric, integer, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { financingClients } from './financing-clients'
import {
  financingTypeEnum,
  propertyTypeEnum,
  vehicleTypeEnum,
  sellerContextEnum,
  vehicleFuelEnum,
  purchaseIntentEnum,
  realEstateObjectiveEnum,
  purchaseTimelineEnum,
  employmentTypeEnum,
} from './enums'

export const financingSimulations = pgTable('financing_simulations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  clientId:       uuid('client_id').references(() => financingClients.id, { onDelete: 'set null' }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
  sessionId:      varchar('session_id', { length: 100 }),

  financingType: financingTypeEnum('financing_type').notNull(),

  // ── Valores comuns ─────────────────────────────────────────
  requestedAmount:   numeric('requested_amount',    { precision: 15, scale: 2 }).notNull(),
  downPaymentAmount: numeric('down_payment_amount', { precision: 15, scale: 2 }).default('0').notNull(),
  financedAmount:    numeric('financed_amount',     { precision: 15, scale: 2 }).notNull(),
  termMonths:        integer('term_months').notNull(),

  // ── Imobiliário ────────────────────────────────────────────
  realEstateObjective: realEstateObjectiveEnum('real_estate_objective'),
  purchaseTimeline:    purchaseTimelineEnum('purchase_timeline'),
  includeFees:         boolean('include_fees'),
  propertyValue:       numeric('property_value', { precision: 15, scale: 2 }),
  propertyType:        propertyTypeEnum('property_type'),
  propertyCity:        varchar('property_city', { length: 100 }),
  propertyState:       varchar('property_state', { length: 2 }),
  fgtsAmount:          numeric('fgts_amount', { precision: 15, scale: 2 }).default('0').notNull(),

  // ── Veículo ────────────────────────────────────────────────
  vehicleType:    vehicleTypeEnum('vehicle_type'),
  vehicleBrand:   varchar('vehicle_brand', { length: 100 }),
  vehicleModel:   varchar('vehicle_model', { length: 100 }),
  vehicleYear:    integer('vehicle_year'),
  vehicleFuel:    vehicleFuelEnum('vehicle_fuel'),
  sellerContext:  sellerContextEnum('seller_context'),
  purchaseIntent: purchaseIntentEnum('purchase_intent'),
  hasCnh:         boolean('has_cnh'),
  residenceState: varchar('residence_state', { length: 2 }),

  // ── Pessoal / Consignado ───────────────────────────────────
  employmentType: employmentTypeEnum('employment_type'),
  employer:       varchar('employer', { length: 255 }),
  loanPurpose:    varchar('loan_purpose', { length: 255 }),

  // Metadados extras por modalidade (flexível)
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type FinancingSimulation    = typeof financingSimulations.$inferSelect
export type NewFinancingSimulation = typeof financingSimulations.$inferInsert
