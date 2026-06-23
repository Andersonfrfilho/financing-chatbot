import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

// Transcript de toda mensagem trocada na conversa do WhatsApp (cliente, bot e atendente).
// varchar (não enum) nos campos de classificação: a máquina/tipos evoluem com frequência.
export const conversationMessages = pgTable('conversation_messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
  direction:      varchar('direction', { length: 12 }).notNull(),   // inbound | outbound
  sender:         varchar('sender', { length: 12 }).notNull(),      // customer | bot | agent
  agentUserId:    uuid('agent_user_id'),                             // atendente (sender=agent)
  type:           varchar('type', { length: 16 }).notNull().default('text'), // text | interactive | system
  content:        text('content'),
  payload:        jsonb('payload').$type<Record<string, unknown>>(),
  waMessageId:    varchar('wa_message_id', { length: 128 }),
  status:         varchar('status', { length: 16 }),                // received | sent | delivered | read | failed
  readAt:         timestamp('read_at', { withTimezone: true }),      // quando a mensagem foi lida
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byConversation: index('idx_conv_messages_number_created').on(t.whatsappNumber, t.createdAt),
  byWaMessageId:  index('idx_conv_messages_wa_id').on(t.waMessageId),
}))

export type ConversationMessage = typeof conversationMessages.$inferSelect
export type NewConversationMessage = typeof conversationMessages.$inferInsert
