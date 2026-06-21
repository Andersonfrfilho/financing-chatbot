# Documentação do Banco de Dados

## Stack

- **SGBD:** PostgreSQL 16 (via pgvector/pgvector:pg16)
- **ORM:** Drizzle ORM (schema-first, type-safe)
- **Migrations:** `drizzle-kit generate` + `drizzle-kit migrate`

## Schema

### users
Usuários do painel administrativo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | Gerado automaticamente |
| role_id | uuid (FK → roles) | Perfil de acesso |
| name | varchar(255) | Nome completo |
| email | varchar(255) unique | E-mail de login |
| password_hash | text | Argon2id hash |
| active | boolean default true | Conta ativa |
| password_must_change | boolean | Força troca de senha |
| created_at / updated_at | timestamptz | Auditoria |

### roles
Perfis de acesso com permissões granulares.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| name | varchar(100) unique | admin, comercial, atendimento |
| description | text | — |
| permissions | jsonb | Array de strings: `["clients:read", "leads:write", ...]` |

### financing_clients
Dados do cliente captados pelo bot (campos sensíveis criptografados).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| whatsapp_number | varchar(20) unique | Número no formato internacional |
| name | varchar(255) | Nome completo |
| cpf_encrypted | text | CPF cifrado (AES-256-GCM) |
| birth_date | varchar(10) | DD/MM/AAAA |
| email | varchar(255) | — |
| phone | varchar(20) | Número alternativo |
| city / state | varchar | Localização |
| civil_status | varchar | solteiro, casado, etc. |
| monthly_income_encrypted | text | Renda mensal cifrada |
| family_income_encrypted | text | Renda familiar cifrada |
| fgts_amount_encrypted | text | Saldo FGTS cifrado |
| down_payment_amount_encrypted | text | Entrada cifrada |
| lgpd_consent_at | timestamptz | Consentimento LGPD |
| deleted_at | timestamptz | Soft delete |

### financing_simulations
Uma simulação por solicitação do bot.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| client_id | uuid (FK) | Cliente vinculado (opcional) |
| financing_type | enum | imobiliario, veiculo, etc. |
| requested_amount | numeric(15,2) | Valor total solicitado |
| down_payment_amount | numeric(15,2) | Entrada disponível |
| financed_amount | numeric(15,2) | Valor efetivo financiado |
| term_months | integer | Prazo em meses |
| property_value / type / city / state | — | Campos imobiliários |
| vehicle_type / year | — | Campos veículo |
| fgts_amount | numeric(15,2) | FGTS para imobiliário |
| metadata | jsonb | Dados extras (empresa, etc.) |

### simulation_results
Um resultado por banco por sistema de amortização.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| simulation_id | uuid (FK) | Simulação pai |
| bank_id | uuid (FK) | Banco |
| bank_rate_id | uuid (FK) | Taxa usada |
| amortization_system | enum | SAC ou PRICE |
| first_installment | numeric(15,2) | Primeira parcela (SAC) |
| last_installment | numeric(15,2) | Última parcela (SAC) |
| fixed_installment | numeric(15,2) | Parcela fixa (PRICE) |
| total_interest | numeric(15,2) | Total de juros |
| total_cost | numeric(15,2) | Custo total |
| cet_annual | numeric(6,4) | CET ao ano |

### banks + bank_rates
Cadastro de bancos e suas taxas por modalidade e data de vigência.

### leads
Pipeline comercial vinculando cliente + simulação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| status | enum | novo, em_atendimento, proposta_enviada, aprovado, reprovado, cancelado, concluido |
| assigned_to | uuid (FK → users) | Consultor responsável |

### conversation_sessions
Estado atual do fluxo conversacional no WhatsApp.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| whatsapp_number | varchar (PK) | Chave única |
| current_state | enum | Estado do fluxo |
| context | jsonb | Dados coletados até agora |
| last_activity | timestamptz | Última mensagem recebida |

### audit_logs
Registro imutável de ações sensíveis.

## Migrations

```bash
# Gerar migration após mudar schema
cd apps/api && bunx drizzle-kit generate

# Aplicar migrations
bunx drizzle-kit migrate

# Via Makefile
make db-reset    # drop + create + migrate + seed
```
