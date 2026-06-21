import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { conversationStateEnum } from './enums'

export const conversationSessions = pgTable('conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull().unique(),
  currentState: conversationStateEnum('current_state').default('greeting').notNull(),
  context: jsonb('context').$type<Record<string, unknown>>().default({}).notNull(),
  lastActivity: timestamp('last_activity', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type ConversationSession = typeof conversationSessions.$inferSelect
export type NewConversationSession = typeof conversationSessions.$inferInsert
