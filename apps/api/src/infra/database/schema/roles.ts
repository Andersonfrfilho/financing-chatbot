import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  permissions: jsonb('permissions').$type<Array<{ resource: string; action: string }>>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
