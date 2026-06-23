ALTER TABLE "conversation_messages" ADD COLUMN "read_at" timestamp with time zone;

CREATE INDEX "idx_conv_messages_read_at" ON "conversation_messages" ("read_at");
