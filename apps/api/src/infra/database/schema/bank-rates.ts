import { pgTable, uuid, numeric, integer, date, timestamp } from 'drizzle-orm/pg-core'
import { banks } from './banks'
import { financingModalityEnum, rateSourceEnum } from './enums'

export const bankRates = pgTable('bank_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankId: uuid('bank_id').notNull().references(() => banks.id, { onDelete: 'cascade' }),
  modality: financingModalityEnum('modality').notNull(),
  rateAnnual: numeric('rate_annual', { precision: 10, scale: 6 }).notNull(),
  referentialRateIndexer: numeric('referential_rate_indexer', { precision: 10, scale: 6 }).default('0').notNull(),
  minTermMonths: integer('min_term_months').notNull(),
  maxTermMonths: integer('max_term_months').notNull(),
  maxLtv: numeric('max_ltv', { precision: 5, scale: 4 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source: rateSourceEnum('source').default('open_finance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type BankRate = typeof bankRates.$inferSelect
export type NewBankRate = typeof bankRates.$inferInsert
