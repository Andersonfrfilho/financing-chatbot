-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE IF NOT EXISTS "person_type" AS ENUM ('pf', 'pj');

CREATE TYPE IF NOT EXISTS "civil_status" AS ENUM (
  'single', 'married', 'divorced', 'widowed', 'stable_union'
);

CREATE TYPE IF NOT EXISTS "financing_type" AS ENUM (
  'imobiliario', 'veiculo', 'pessoal', 'consignado', 'empresa', 'equipamento', 'rural'
);

CREATE TYPE IF NOT EXISTS "property_type" AS ENUM (
  'residential', 'commercial', 'land', 'rural'
);

CREATE TYPE IF NOT EXISTS "vehicle_type" AS ENUM (
  'car', 'motorcycle', 'truck', 'other'
);

CREATE TYPE IF NOT EXISTS "seller_context" AS ENUM (
  'dealer', 'dealership', 'private'
);

CREATE TYPE IF NOT EXISTS "vehicle_fuel" AS ENUM (
  'flex', 'gasoline', 'diesel', 'electric', 'hybrid'
);

CREATE TYPE IF NOT EXISTS "purchase_intent" AS ENUM (
  'researching', 'buying'
);

CREATE TYPE IF NOT EXISTS "real_estate_objective" AS ENUM (
  'financing', 'home_equity', 'portability'
);

CREATE TYPE IF NOT EXISTS "purchase_timeline" AS ENUM (
  'immediate', '3m', '6m', '12m', 'researching'
);

CREATE TYPE IF NOT EXISTS "employment_type" AS ENUM (
  'clt', 'public_servant', 'self_employed', 'business_owner', 'retired'
);

CREATE TYPE IF NOT EXISTS "amortization_system" AS ENUM ('SAC', 'PRICE', 'NAO_APLICAVEL');

CREATE TYPE IF NOT EXISTS "financing_modality" AS ENUM (
  'SFH', 'SFI', 'FGTS', 'MCMV', 'CDC', 'LEASING',
  'PESSOAL', 'CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS',
  'CAPITAL_GIRO', 'DESCONTO_DUPLICATAS', 'RURAL', 'FINAME'
);

CREATE TYPE IF NOT EXISTS "rate_source" AS ENUM ('open_finance', 'manual');

CREATE TYPE IF NOT EXISTS "lead_status" AS ENUM (
  'new', 'qualified', 'disqualified', 'negotiating', 'proposal_sent', 'won', 'lost'
);

CREATE TYPE IF NOT EXISTS "conversation_state" AS ENUM (
  'greeting',
  'awaiting_financing_type',
  'awaiting_person_type',
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

CREATE TABLE IF NOT EXISTS "roles" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        VARCHAR(100) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "users" (
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

CREATE TABLE IF NOT EXISTS "banks" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                  VARCHAR(255) NOT NULL,
  "code"                  VARCHAR(50) NOT NULL UNIQUE,
  "open_finance_base_url" VARCHAR(500),
  "logo_url"              VARCHAR(500),
  "active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "bank_rates" (
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

-- Dados sensíveis armazenados criptografados (LGPD)
CREATE TABLE IF NOT EXISTS "financing_clients" (
  "id"                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsapp_number"             VARCHAR(20) NOT NULL UNIQUE,
  "person_type"                 "person_type" NOT NULL DEFAULT 'pf',

  -- Pessoa Física
  "name"                        VARCHAR(255),
  "cpf_encrypted"               TEXT,
  "birth_date"                  DATE,
  "civil_status"                "civil_status",
  "phone"                       VARCHAR(20),
  "email"                       VARCHAR(255),
  "city"                        VARCHAR(100),
  "state"                       VARCHAR(2),
  "monthly_income_encrypted"    TEXT,

  -- Co-participante
  "has_co_participant"              BOOLEAN DEFAULT FALSE,
  "co_participant_income_encrypted" TEXT,

  -- Pessoa Jurídica
  "company_name"                VARCHAR(255),
  "cnpj_encrypted"              TEXT,
  "responsible_name"            VARCHAR(255),
  "company_revenue_encrypted"   TEXT,

  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "financing_simulations" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"        UUID REFERENCES "financing_clients"("id") ON DELETE SET NULL,
  "whatsapp_number"  VARCHAR(20) NOT NULL,
  "session_id"       VARCHAR(100),
  "financing_type"   "financing_type" NOT NULL,

  -- Valores comuns
  "requested_amount"    NUMERIC(15,2) NOT NULL,
  "down_payment_amount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "financed_amount"     NUMERIC(15,2) NOT NULL,
  "term_months"         INTEGER NOT NULL,

  -- Imobiliário
  "real_estate_objective" "real_estate_objective",
  "purchase_timeline"     "purchase_timeline",
  "include_fees"          BOOLEAN,
  "property_value"        NUMERIC(15,2),
  "property_type"         "property_type",
  "property_city"         VARCHAR(100),
  "property_state"        VARCHAR(2),
  "fgts_amount"           NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Veículo
  "vehicle_type"    "vehicle_type",
  "vehicle_brand"   VARCHAR(100),
  "vehicle_model"   VARCHAR(100),
  "vehicle_year"    INTEGER,
  "vehicle_fuel"    "vehicle_fuel",
  "seller_context"  "seller_context",
  "purchase_intent" "purchase_intent",
  "has_cnh"         BOOLEAN,
  "residence_state" VARCHAR(2),

  -- Pessoal / Consignado
  "employment_type" "employment_type",
  "employer"        VARCHAR(255),
  "loan_purpose"    VARCHAR(255),

  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "simulation_results" (
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

CREATE TABLE IF NOT EXISTS "leads" (
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

CREATE TABLE IF NOT EXISTS "conversation_sessions" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whatsapp_number"  VARCHAR(20) NOT NULL UNIQUE,
  "current_state"    "conversation_state" NOT NULL DEFAULT 'greeting',
  "context"          JSONB NOT NULL DEFAULT '{}',
  "last_activity"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
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

CREATE INDEX IF NOT EXISTS "idx_leads_whatsapp"         ON "leads"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_leads_status"           ON "leads"("status");
CREATE INDEX IF NOT EXISTS "idx_leads_assigned_to"      ON "leads"("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_simulations_whatsapp"   ON "financing_simulations"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_simulations_type"       ON "financing_simulations"("financing_type");
CREATE INDEX IF NOT EXISTS "idx_sessions_last_activity" ON "conversation_sessions"("last_activity");
CREATE INDEX IF NOT EXISTS "idx_bank_rates_bank"        ON "bank_rates"("bank_id", "modality");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource"    ON "audit_logs"("resource_type", "resource_id");
