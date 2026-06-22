-- Transcript de mensagens da conversa (cliente, bot, atendente) — base do histórico e do chat humano.
CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsapp_number" varchar(20) NOT NULL,
  "direction"       varchar(12) NOT NULL,
  "sender"          varchar(12) NOT NULL,
  "agent_user_id"   uuid,
  "type"            varchar(16) NOT NULL DEFAULT 'text',
  "content"         text,
  "payload"         jsonb,
  "wa_message_id"   varchar(128),
  "status"          varchar(16),
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_conv_messages_number_created" ON "conversation_messages" ("whatsapp_number", "created_at");
CREATE INDEX IF NOT EXISTS "idx_conv_messages_wa_id" ON "conversation_messages" ("wa_message_id");
