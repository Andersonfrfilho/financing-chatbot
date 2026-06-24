ALTER TABLE "conversation_messages" ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "idx_conv_messages_read_at" ON "conversation_messages" ("read_at");
