import { pgTable, uuid, varchar, date, timestamp, boolean, text } from 'drizzle-orm/pg-core'
import { civilStatusEnum, personTypeEnum } from './enums'

// Dados sensíveis armazenados criptografados (LGPD)
export const financingClients = pgTable('financing_clients', {
  id:              uuid('id').primaryKey().defaultRandom(),
  whatsappNumber:  varchar('whatsapp_number', { length: 20 }).notNull().unique(),
  personType:      personTypeEnum('person_type').default('pf').notNull(),

  // ── Pessoa Física ──────────────────────────────────────────
  name:                    varchar('name', { length: 255 }),
  cpfEncrypted:            text('cpf_encrypted'),
  birthDate:               date('birth_date'),
  civilStatus:             civilStatusEnum('civil_status'),
  phone:                   varchar('phone', { length: 20 }),
  email:                   varchar('email', { length: 255 }),
  city:                    varchar('city', { length: 100 }),
  state:                   varchar('state', { length: 2 }),
  monthlyIncomeEncrypted:  text('monthly_income_encrypted'),

  // ── Co-participante ────────────────────────────────────────
  hasCoParticipant:              boolean('has_co_participant').default(false),
  coParticipantIncomeEncrypted:  text('co_participant_income_encrypted'),

  // ── Pessoa Jurídica ────────────────────────────────────────
  companyName:             varchar('company_name', { length: 255 }),
  cnpjEncrypted:           text('cnpj_encrypted'),
  responsibleName:         varchar('responsible_name', { length: 255 }),
  companyRevenueEncrypted: text('company_revenue_encrypted'),

  // ── Timestamps ─────────────────────────────────────────────
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type FinancingClient    = typeof financingClients.$inferSelect
export type NewFinancingClient = typeof financingClients.$inferInsert
