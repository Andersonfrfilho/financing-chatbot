DO $$ BEGIN
  CREATE TYPE "public"."amortization_system" AS ENUM('SAC', 'PRICE', 'NAO_APLICAVEL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."civil_status" AS ENUM('single', 'married', 'divorced', 'widowed', 'stable_union');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."conversation_state" AS ENUM('greeting', 'awaiting_financing_type', 'awaiting_person_type', 'awaiting_name', 'awaiting_cpf', 'awaiting_birth_date', 'awaiting_civil_status', 'awaiting_email', 'awaiting_city', 'awaiting_state', 'awaiting_monthly_income', 'awaiting_family_income', 'awaiting_fgts', 'awaiting_fgts_amount', 'awaiting_down_payment', 'awaiting_down_payment_amount', 'awaiting_property_value', 'awaiting_property_type', 'awaiting_property_city', 'awaiting_property_state', 'awaiting_vehicle_type', 'awaiting_vehicle_value', 'awaiting_vehicle_year', 'awaiting_vehicle_down_payment', 'awaiting_loan_amount', 'awaiting_employment_type', 'awaiting_employer', 'awaiting_company_cnpj', 'awaiting_company_revenue', 'awaiting_loan_purpose', 'awaiting_term', 'simulation_ready', 'human_handoff', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."employment_type" AS ENUM('clt', 'public_servant', 'self_employed', 'business_owner', 'retired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."financing_modality" AS ENUM('SFH', 'SFI', 'FGTS', 'MCMV', 'CDC', 'LEASING', 'PESSOAL', 'CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS', 'CAPITAL_GIRO', 'DESCONTO_DUPLICATAS', 'RURAL', 'FINAME');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."financing_type" AS ENUM('imobiliario', 'veiculo', 'pessoal', 'consignado', 'empresa', 'equipamento', 'rural');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualified', 'disqualified', 'negotiating', 'proposal_sent', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."person_type" AS ENUM('pf', 'pj');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."property_type" AS ENUM('residential', 'commercial', 'land', 'rural');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."purchase_intent" AS ENUM('researching', 'buying');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."purchase_timeline" AS ENUM('immediate', '3m', '6m', '12m', 'researching');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."rate_source" AS ENUM('open_finance', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."real_estate_objective" AS ENUM('financing', 'home_equity', 'portability');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."seller_context" AS ENUM('dealer', 'dealership', 'private');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."vehicle_fuel" AS ENUM('flex', 'gasoline', 'diesel', 'electric', 'hybrid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."vehicle_type" AS ENUM('car', 'motorcycle', 'truck', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_config" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"modality" "financing_modality" NOT NULL,
	"rate_annual" numeric(10, 6) NOT NULL,
	"referential_rate_indexer" numeric(10, 6) DEFAULT '0' NOT NULL,
	"min_term_months" integer NOT NULL,
	"max_term_months" integer NOT NULL,
	"max_ltv" numeric(5, 4) NOT NULL,
	"effective_date" date NOT NULL,
	"source" "rate_source" DEFAULT 'open_finance' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"open_finance_base_url" varchar(500),
	"logo_url" varchar(500),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"direction" varchar(12) NOT NULL,
	"sender" varchar(12) NOT NULL,
	"agent_user_id" uuid,
	"type" varchar(16) DEFAULT 'text' NOT NULL,
	"content" text,
	"payload" jsonb,
	"wa_message_id" varchar(128),
	"status" varchar(16),
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"current_state" varchar(64) DEFAULT 'greeting' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mode" varchar(12) DEFAULT 'bot' NOT NULL,
	"assigned_user_id" uuid,
	"human_requested_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"last_agent_read_at" timestamp with time zone,
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_sessions_whatsapp_number_unique" UNIQUE("whatsapp_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financing_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"person_type" "person_type" DEFAULT 'pf' NOT NULL,
	"name" varchar(255),
	"cpf_encrypted" text,
	"birth_date" date,
	"civil_status" "civil_status",
	"phone" varchar(20),
	"email" varchar(255),
	"city" varchar(100),
	"state" varchar(2),
	"monthly_income_encrypted" text,
	"has_co_participant" boolean DEFAULT false,
	"co_participant_income_encrypted" text,
	"company_name" varchar(255),
	"cnpj_encrypted" text,
	"responsible_name" varchar(255),
	"company_revenue_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "financing_clients_whatsapp_number_unique" UNIQUE("whatsapp_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financing_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"whatsapp_number" varchar(20) NOT NULL,
	"session_id" varchar(100),
	"financing_type" "financing_type" NOT NULL,
	"requested_amount" numeric(15, 2) NOT NULL,
	"down_payment_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"financed_amount" numeric(15, 2) NOT NULL,
	"term_months" integer NOT NULL,
	"real_estate_objective" "real_estate_objective",
	"purchase_timeline" "purchase_timeline",
	"include_fees" boolean,
	"property_value" numeric(15, 2),
	"property_type" "property_type",
	"property_city" varchar(100),
	"property_state" varchar(2),
	"fgts_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"vehicle_type" "vehicle_type",
	"vehicle_brand" varchar(100),
	"vehicle_model" varchar(100),
	"vehicle_year" integer,
	"vehicle_fuel" "vehicle_fuel",
	"seller_context" "seller_context",
	"purchase_intent" "purchase_intent",
	"has_cnh" boolean,
	"residence_state" varchar(2),
	"employment_type" "employment_type",
	"employer" varchar(255),
	"loan_purpose" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"simulation_id" uuid,
	"whatsapp_number" varchar(20) NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"simulation_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"bank_rate_id" uuid,
	"amortization_system" "amortization_system" NOT NULL,
	"first_installment" numeric(15, 2) NOT NULL,
	"last_installment" numeric(15, 2),
	"fixed_installment" numeric(15, 2),
	"total_interest" numeric(15, 2) NOT NULL,
	"total_cost" numeric(15, 2) NOT NULL,
	"cet_annual" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"password_must_change" boolean DEFAULT false NOT NULL,
	"reset_token" varchar(255),
	"reset_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_rates" ADD CONSTRAINT "bank_rates_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financing_simulations" ADD CONSTRAINT "financing_simulations_client_id_financing_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."financing_clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_financing_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."financing_clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_simulation_id_financing_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."financing_simulations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_simulation_id_financing_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."financing_simulations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_bank_rate_id_bank_rates_id_fk" FOREIGN KEY ("bank_rate_id") REFERENCES "public"."bank_rates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conv_messages_number_created" ON "conversation_messages" USING btree ("whatsapp_number","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conv_messages_wa_id" ON "conversation_messages" USING btree ("wa_message_id");