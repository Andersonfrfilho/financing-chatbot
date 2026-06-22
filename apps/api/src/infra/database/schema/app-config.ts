import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const appConfig = pgTable('app_config', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: text('value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AppConfig = typeof appConfig.$inferSelect
export type NewAppConfig = typeof appConfig.$inferInsert
