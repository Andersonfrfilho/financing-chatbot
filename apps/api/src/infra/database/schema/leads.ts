import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { financingClients } from './financing-clients'
import { financingSimulations } from './financing-simulations'
import { users } from './users'
import { leadStatusEnum } from './enums'

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => financingClients.id, { onDelete: 'set null' }),
  simulationId: uuid('simulation_id').references(() => financingSimulations.id, { onDelete: 'set null' }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
  status: leadStatusEnum('status').default('new').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
