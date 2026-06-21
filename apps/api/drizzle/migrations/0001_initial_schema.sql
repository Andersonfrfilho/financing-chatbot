-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE "civil_status" AS ENUM (
  'single', 'married', 'divorced', 'widowed', 'stable_union'
);

CREATE TYPE "financing_type" AS ENUM (
  'imobiliario', 'veiculo', 'pessoal', 'consignado', 'empresa', 'equipamento', 'rural'
);

CREATE TYPE "property_type" AS ENUM (
  'residential', 'commercial', 'land', 'rural'
);

CREATE TYPE "vehicle_type" AS ENUM (
  'car', 'motorcycle', 'truck', 'other'
);

CREATE TYPE "amortization_system" AS ENUM ('SAC', 'PRICE', 'NAO_APLICAVEL');

CREATE TYPE "financing_modality" AS ENUM (
  'SFH', 'SFI', 'FGTS', 'MCMV', 'CDC', 'LEASING',
  'PESSOAL', 'CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS',
  'CAPITAL_GIRO', 'DESCONTO_DUPLICATAS', 'RURAL', 'FINAME'
);

CREATE TYPE "rate_source" AS ENUM ('open_finance', 'manual');

CREATE TYPE "lead_status" AS ENUM (
  'new', 'qualified', 'disqualified', 'negotiating', 'proposal_sent', 'won', 'lost'
);

CREATE TYPE "conversation_state" AS ENUM (
  'greeting',
  'awaiting_financing_type',
  'awaiting_name',
  'awaiting_cpf',
  'awaiting_birth_date',
  'awaiting_civil_status',
  'awaiting_email',
  'awaiting_city',
  'awaiting_state',
  'awaiting_monthly_income',
  'awaiting_family_income',
  'awaiting_fgts',
  'awaiting_fgts_amount',
  'awaiting_down_payment',
  'awaiting_down_payment_amount',
  'awaiting_property_value',
  'awaiting_property_type',
  'awaiting_property_city',
  'awaiting_property_state',
  'awaiting_vehicle_type',
  'awaiting_vehicle_value',
  'awaiting_vehicle_year',
  'awaiting_vehicle_down_payment',
  'awaiting_loan_amount',
  'awaiting_employment_type',
  'awaiting_employer',
  'awaiting_company_cnpj',
  'awaiting_company_revenue',
  'awaiting_loan_purpose',
  'awaiting_term',
  'simulation_ready',
  'human_handoff',
  'completed',
  'abandoned'
);

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE "roles" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        VARCHAR(100) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "users" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "role_id"              UUID NOT NULL REFERENCES "roles"("id"),
  "name"                 VARCHAR(255) NOT NULL,
  "email"                VARCHAR(255) NOT NULL UNIQUE,
  "password_hash"        VARCHAR(255) NOT NULL,
  "active"               BOOLEAN NOT NULL DEFAULT TRUE,
  "password_must_change" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "banks" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                  VARCHAR(255) NOT NULL,
  "code"                  VARCHAR(50) NOT NULL UNIQUE,
  "open_finance_base_url" VARCHAR(500),
  "logo_url"              VARCHAR(500),
  "active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "bank_rates" (
  "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bank_id"                   UUID NOT NULL REFERENCES "banks"("id") ON DELETE CASCADE,
  "modality"                  "financing_modality" NOT NULL,
  "rate_annual"               NUMERIC(10,6) NOT NULL,
  "referential_rate_indexer"  NUMERIC(10,6) NOT NULL DEFAULT 0,
  "min_term_months"           INTEGER NOT NULL,
  "max_term_months"           INTEGER NOT NULL,
  "max_ltv"                   NUMERIC(5,4) NOT NULL,
  "effective_date"            DATE NOT NULL,
  "source"                    "rate_source" NOT NULL DEFAULT 'open_finance',
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CPF e dados financeiros armazenados criptografados (LGPD)
CREATE TABLE "financing_clients" (
  "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsapp_number"           VARCHAR(20) NOT NULL UNIQUE,
  "name"                      VARCHAR(255),
  "cpf_encrypted"             TEXT,
  "birth_date"                DATE,
  "civil_status"              "civil_status",
  "phone"                     VARCHAR(20),
  "email"                     VARCHAR(255),
  "city"                      VARCHAR(100),
  "state"                     VARCHAR(2),
  "monthly_income_encrypted"  TEXT,
  "family_income_encrypted"   TEXT,
  "has_fgts"                  BOOLEAN,
  "fgts_amount_encrypted"     TEXT,
  "has_down_payment"          BOOLEAN,
  "down_payment_amount_encrypted" TEXT,
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"                TIMESTAMPTZ
);

CREATE TABLE "financing_simulations" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"        UUID REFERENCES "financing_clients"("id") ON DELETE SET NULL,
  "whatsapp_number"  VARCHAR(20) NOT NULL,
  "session_id"       VARCHAR(100),
  "financing_type"   "financing_type" NOT NULL,
  "requested_amount" NUMERIC(15,2) NOT NULL,
  "down_payment_amount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "financed_amount"  NUMERIC(15,2) NOT NULL,
  "term_months"      INTEGER NOT NULL,
  "property_value"   NUMERIC(15,2),
  "property_type"    "property_type",
  "property_city"    VARCHAR(100),
  "property_state"   VARCHAR(2),
  "fgts_amount"      NUMERIC(15,2) NOT NULL DEFAULT 0,
  "vehicle_type"     "vehicle_type",
  "vehicle_year"     INTEGER,
  "metadata"         JSONB NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "simulation_results" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id"       UUID NOT NULL REFERENCES "financing_simulations"("id") ON DELETE CASCADE,
  "bank_id"             UUID NOT NULL REFERENCES "banks"("id"),
  "bank_rate_id"        UUID REFERENCES "bank_rates"("id"),
  "amortization_system" "amortization_system" NOT NULL,
  "first_installment"   NUMERIC(15,2) NOT NULL,
  "last_installment"    NUMERIC(15,2),
  "fixed_installment"   NUMERIC(15,2),
  "total_interest"      NUMERIC(15,2) NOT NULL,
  "total_cost"          NUMERIC(15,2) NOT NULL,
  "cet_annual"          NUMERIC(10,6),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "leads" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"        UUID REFERENCES "financing_clients"("id") ON DELETE SET NULL,
  "simulation_id"    UUID REFERENCES "financing_simulations"("id") ON DELETE SET NULL,
  "whatsapp_number"  VARCHAR(20) NOT NULL,
  "status"           "lead_status" NOT NULL DEFAULT 'new',
  "assigned_to"      UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "notes"            TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "conversation_sessions" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsapp_number"  VARCHAR(20) NOT NULL UNIQUE,
  "current_state"    "conversation_state" NOT NULL DEFAULT 'greeting',
  "context"          JSONB NOT NULL DEFAULT '{}',
  "last_activity"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "audit_logs" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID,
  "action"        VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(100) NOT NULL,
  "resource_id"   VARCHAR(100),
  "metadata"      JSONB NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX "idx_leads_whatsapp"         ON "leads"("whatsapp_number");
CREATE INDEX "idx_leads_status"           ON "leads"("status");
CREATE INDEX "idx_leads_assigned_to"      ON "leads"("assigned_to");
CREATE INDEX "idx_simulations_whatsapp"   ON "financing_simulations"("whatsapp_number");
CREATE INDEX "idx_simulations_type"       ON "financing_simulations"("financing_type");
CREATE INDEX "idx_sessions_last_activity" ON "conversation_sessions"("last_activity");
CREATE INDEX "idx_bank_rates_bank"        ON "bank_rates"("bank_id", "modality");
CREATE INDEX "idx_audit_logs_resource"    ON "audit_logs"("resource_type", "resource_id");
