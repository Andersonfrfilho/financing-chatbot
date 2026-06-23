-- Takeover humano: a sessão pode estar em modo bot (default) ou human (bot pausado, atendente no controle).
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "mode" varchar(12) NOT NULL DEFAULT 'bot';
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "assigned_user_id" uuid;
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "human_requested_at" timestamptz;
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamptz;
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "last_agent_read_at" timestamptz;
