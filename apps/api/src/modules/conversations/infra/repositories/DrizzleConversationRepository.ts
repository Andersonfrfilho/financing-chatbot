import { and, eq, lt, desc, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { conversationMessages } from '@/infra/database/schema'
import type { ConversationMessage } from '@/infra/database/schema'

export interface LogMessageInput {
  whatsappNumber: string
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'bot' | 'agent'
  agentUserId?: string | null
  type?: string
  content?: string | null
  payload?: Record<string, unknown> | null
  waMessageId?: string | null
  status?: string | null
}

export interface ConversationListItem {
  whatsappNumber: string
  lastContent: string | null
  lastDirection: string | null
  lastAt: string
  clientName: string | null
  currentState: string | null
}

export class DrizzleConversationRepository {
  async insertMessage(input: LogMessageInput): Promise<ConversationMessage | null> {
    // Dedup de inbound do WhatsApp (mesmo wa_message_id pode chegar repetido)
    if (input.waMessageId) {
      const existing = await db
        .select({ id: conversationMessages.id })
        .from(conversationMessages)
        .where(eq(conversationMessages.waMessageId, input.waMessageId))
        .limit(1)
      if (existing.length > 0) return null
    }
    const [row] = await db
      .insert(conversationMessages)
      .values({
        whatsappNumber: input.whatsappNumber,
        direction:      input.direction,
        sender:         input.sender,
        agentUserId:    input.agentUserId ?? null,
        type:           input.type ?? 'text',
        content:        input.content ?? null,
        payload:        input.payload ?? null,
        waMessageId:    input.waMessageId ?? null,
        status:         input.status ?? null,
      })
      .returning()
    return row ?? null
  }

  // Histórico paginado por cursor (created_at). Retorna em ordem cronológica (mais antigo → mais novo).
  async listMessages(whatsappNumber: string, before: Date | null, limit: number): Promise<ConversationMessage[]> {
    const where = before
      ? and(eq(conversationMessages.whatsappNumber, whatsappNumber), lt(conversationMessages.createdAt, before))
      : eq(conversationMessages.whatsappNumber, whatsappNumber)
    const rows = await db
      .select()
      .from(conversationMessages)
      .where(where)
      .orderBy(desc(conversationMessages.createdAt))
      .limit(limit)
    return rows.reverse()
  }

  // Lista de conversas: última mensagem por número + nome do cliente + estado da sessão.
  async listConversations(limit: number, offset: number): Promise<ConversationListItem[]> {
    const result = await db.execute(sql`
      SELECT t.whatsapp_number   AS "whatsappNumber",
             t.content           AS "lastContent",
             t.direction         AS "lastDirection",
             t.created_at        AS "lastAt",
             c.name              AS "clientName",
             s.current_state     AS "currentState"
      FROM (
        SELECT DISTINCT ON (m.whatsapp_number)
               m.whatsapp_number, m.content, m.direction, m.created_at
        FROM conversation_messages m
        ORDER BY m.whatsapp_number, m.created_at DESC
      ) t
      LEFT JOIN financing_clients c
        ON c.whatsapp_number = t.whatsapp_number AND c.deleted_at IS NULL
      LEFT JOIN conversation_sessions s
        ON s.whatsapp_number = t.whatsapp_number
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)
    return (result.rows ?? []) as unknown as ConversationListItem[]
  }
}
