import { pgTable, uuid, numeric, timestamp } from 'drizzle-orm/pg-core'
import { financingSimulations } from './financing-simulations'
import { banks } from './banks'
import { bankRates } from './bank-rates'
import { amortizationSystemEnum } from './enums'

export const simulationResults = pgTable('simulation_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  simulationId: uuid('simulation_id').notNull().references(() => financingSimulations.id, { onDelete: 'cascade' }),
  bankId: uuid('bank_id').notNull().references(() => banks.id),
  bankRateId: uuid('bank_rate_id').references(() => bankRates.id),
  amortizationSystem: amortizationSystemEnum('amortization_system').notNull(),

  // SAC: parcela varia; PRICE: parcela fixa
  firstInstallment: numeric('first_installment', { precision: 15, scale: 2 }).notNull(),
  lastInstallment: numeric('last_installment', { precision: 15, scale: 2 }),
  fixedInstallment: numeric('fixed_installment', { precision: 15, scale: 2 }),

  totalInterest: numeric('total_interest', { precision: 15, scale: 2 }).notNull(),
  totalCost: numeric('total_cost', { precision: 15, scale: 2 }).notNull(),
  cetAnnual: numeric('cet_annual', { precision: 10, scale: 6 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type SimulationResult = typeof simulationResults.$inferSelect
export type NewSimulationResult = typeof simulationResults.$inferInsert
