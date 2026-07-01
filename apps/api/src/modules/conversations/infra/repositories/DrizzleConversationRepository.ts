import { and, eq, lt, desc, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { conversationMessages, conversationSessions } from '@/infra/database/schema'
import type { ConversationMessage } from '@/infra/database/schema'
import { logger } from '@/shared/logger'

const log = logger.child('ConversationRepo')

export interface SessionMode {
  whatsappNumber: string
  mode: string
  assignedUserId: string | null
}

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
  lastInboundAt: string | null
  clientName: string | null
  currentState: string | null
  mode: string | null
  assignedUserId: string | null
  waitingHuman: boolean
  unread: number
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

    // Garantir que a session existe
    const existingSession = await db
      .select({ whatsappNumber: conversationSessions.whatsappNumber })
      .from(conversationSessions)
      .where(eq(conversationSessions.whatsappNumber, input.whatsappNumber))
      .limit(1)

    if (existingSession.length === 0) {
      await db
        .insert(conversationSessions)
        .values({
          whatsappNumber: input.whatsappNumber,
          mode: 'bot',
          currentState: 'new',
          context: {},
          humanRequestedAt: null,
          assignedUserId: null,
          lastAgentReadAt: null,
        })
        .onConflictDoNothing()
    }

    // Se status='read', atualizar a mensagem anterior com readAt=now()
    if (input.status === 'read' && input.waMessageId) {
      await db
        .update(conversationMessages)
        .set({ readAt: new Date() })
        .where(eq(conversationMessages.waMessageId, input.waMessageId))
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
    const t0 = Date.now()
    const where = before
      ? and(eq(conversationMessages.whatsappNumber, whatsappNumber), lt(conversationMessages.createdAt, before))
      : eq(conversationMessages.whatsappNumber, whatsappNumber)
    const rows = await db
      .select()
      .from(conversationMessages)
      .where(where)
      .orderBy(desc(conversationMessages.createdAt))
      .limit(limit)
    log.debug('listMessages', { ms: Date.now() - t0, rows: rows.length, before: before?.toISOString(), whatsappNumber })
    return rows.reverse()
  }

  async getSessionMode(whatsappNumber: string): Promise<SessionMode | null> {
    const rows = await db
      .select({
        whatsappNumber: conversationSessions.whatsappNumber,
        mode: conversationSessions.mode,
        assignedUserId: conversationSessions.assignedUserId,
      })
      .from(conversationSessions)
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
      .limit(1)
    return rows[0] ?? null
  }

  async setMode(whatsappNumber: string, mode: 'bot' | 'human', assignedUserId: string | null): Promise<boolean> {
    const updated = await db
      .update(conversationSessions)
      .set({
        mode,
        assignedUserId,
        humanRequestedAt: mode === 'human' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
      .returning({ id: conversationSessions.id })
    return updated.length > 0
  }

  // Lista de conversas: última mensagem por número + cliente + estado + não-lidas + fila.
  async listConversations(limit: number, offset: number, waitingOnly: boolean, hasUnread = false): Promise<ConversationListItem[]> {
    const t0 = Date.now()
    const waitingFilter = waitingOnly
      ? sql`WHERE s.human_requested_at IS NOT NULL AND s.assigned_user_id IS NULL`
      : sql``
    const innerQuery = sql`
      SELECT t.whatsapp_number   AS "whatsappNumber",
             t.content           AS "lastContent",
             t.direction         AS "lastDirection",
             t.created_at        AS "lastAt",
             c.name              AS "clientName",
             s.current_state     AS "currentState",
             s.mode              AS "mode",
             s.assigned_user_id  AS "assignedUserId",
             (s.human_requested_at IS NOT NULL AND s.assigned_user_id IS NULL) AS "waitingHuman",
             COALESCE((
                SELECT count(*)::int FROM conversation_messages u
                WHERE u.whatsapp_number = t.whatsapp_number AND u.direction = 'inbound'
                  AND (s.last_agent_read_at IS NULL OR u.created_at > s.last_agent_read_at)
              ), 0) AS "unread",
              (SELECT MAX(m2.created_at) FROM conversation_messages m2
               WHERE m2.whatsapp_number = t.whatsapp_number AND m2.direction = 'inbound') AS "lastInboundAt"
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
      ${waitingFilter}
    `
    const result = hasUnread
      ? await db.execute(sql`SELECT * FROM (${innerQuery}) sub WHERE sub."unread" > 0 ORDER BY "lastAt" DESC LIMIT ${limit} OFFSET ${offset}`)
      : await db.execute(sql`${innerQuery} ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`)
    log.debug('listConversations_query', { ms: Date.now() - t0, rows: result.rows?.length ?? 0, waitingOnly })
    return (result.rows ?? []) as unknown as ConversationListItem[]
  }

  async markRead(whatsappNumber: string): Promise<void> {
    await db
      .update(conversationSessions)
      .set({ lastAgentReadAt: new Date(), updatedAt: new Date() })
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
  }

  // Marca a conversa como "aguardando humano" (cliente pediu consultor). Não sobrescreve se já assumida.
  async requestHuman(whatsappNumber: string): Promise<void> {
    await db
      .update(conversationSessions)
      .set({ humanRequestedAt: new Date(), updatedAt: new Date() })
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
  }

  // Conta conversas ativas (modo human) do atendente.
  async countActiveSessionsForAgent(agentUserId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(conversationSessions)
      .where(and(eq(conversationSessions.mode, 'human'), eq(conversationSessions.assignedUserId, agentUserId)))
    return result[0]?.count ?? 0
  }

  async getContext(whatsappNumber: string): Promise<Record<string, unknown> | null> {
    const rows = await db
      .select({ context: conversationSessions.context })
      .from(conversationSessions)
      .where(eq(conversationSessions.whatsappNumber, whatsappNumber))
      .limit(1)
    return rows[0]?.context ?? null
  }
}
