import { pgTable, uuid, varchar, date, timestamp, boolean, text } from 'drizzle-orm/pg-core'
import { civilStatusEnum } from './enums'

// CPF, renda e dados financeiros armazenados criptografados (LGPD)
export const financingClients = pgTable('financing_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),

  // Dados pessoais
  name: varchar('name', { length: 255 }),
  cpfEncrypted: text('cpf_encrypted'),
  birthDate: date('birth_date'),
  civilStatus: civilStatusEnum('civil_status'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),

  // Dados financeiros (criptografados)
  monthlyIncomeEncrypted: text('monthly_income_encrypted'),
  familyIncomeEncrypted: text('family_income_encrypted'),
  hasFgts: boolean('has_fgts'),
  fgtsAmountEncrypted: text('fgts_amount_encrypted'),
  hasDownPayment: boolean('has_down_payment'),
  downPaymentAmountEncrypted: text('down_payment_amount_encrypted'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type FinancingClient = typeof financingClients.$inferSelect
export type NewFinancingClient = typeof financingClients.$inferInsert
