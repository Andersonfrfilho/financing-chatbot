import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

export const banks = pgTable('banks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  openFinanceBaseUrl: varchar('open_finance_base_url', { length: 500 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Bank = typeof banks.$inferSelect
export type NewBank = typeof banks.$inferInsert
