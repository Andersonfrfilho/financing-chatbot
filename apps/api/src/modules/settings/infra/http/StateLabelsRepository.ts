export const STATE_LABELS: Record<string, { label: string; color: string }> = {
  // ── Inicial ──────────────────────────────────────────────────────────────
  greeting:                   { label: 'Saudação',                color: 'bg-blue-100 text-blue-700' },

  // ── Tipo de financiamento ────────────────────────────────────────────────
  awaiting_financing_type:    { label: 'Selecionando tipo',       color: 'bg-blue-100 text-blue-700' },
  awaiting_person_type:       { label: 'Tipo de pessoa',          color: 'bg-blue-100 text-blue-700' },

  // ── Dados pessoais ────────────────────────────────────────────────────────
  awaiting_name:              { label: 'Aguardando nome',         color: 'bg-purple-100 text-purple-700' },
  awaiting_cpf:               { label: 'Aguardando CPF',          color: 'bg-purple-100 text-purple-700' },
  awaiting_birth_date:        { label: 'Aguardando nascimento',   color: 'bg-purple-100 text-purple-700' },
  awaiting_civil_status:      { label: 'Estado civil',            color: 'bg-purple-100 text-purple-700' },
  awaiting_email:             { label: 'Aguardando e-mail',       color: 'bg-purple-100 text-purple-700' },
  awaiting_city:              { label: 'Aguardando cidade',       color: 'bg-purple-100 text-purple-700' },
  awaiting_state:             { label: 'Aguardando estado (UF)',  color: 'bg-purple-100 text-purple-700' },

  // ── Renda e FGTS ─────────────────────────────────────────────────────────
  awaiting_monthly_income:    { label: 'Aguardando renda',        color: 'bg-indigo-100 text-indigo-700' },
  awaiting_family_income:     { label: 'Renda familiar',          color: 'bg-indigo-100 text-indigo-700' },
  awaiting_fgts:              { label: 'Possui FGTS?',            color: 'bg-indigo-100 text-indigo-700' },
  awaiting_fgts_amount:       { label: 'Valor do FGTS',           color: 'bg-indigo-100 text-indigo-700' },

  // ── Imóvel ───────────────────────────────────────────────────────────────
  awaiting_down_payment:      { label: 'Tem entrada?',            color: 'bg-cyan-100 text-cyan-700' },
  awaiting_down_payment_amount: { label: 'Valor da entrada',      color: 'bg-cyan-100 text-cyan-700' },
  awaiting_property_value:    { label: 'Valor do imóvel',         color: 'bg-cyan-100 text-cyan-700' },
  awaiting_property_type:     { label: 'Tipo do imóvel',          color: 'bg-cyan-100 text-cyan-700' },
  awaiting_property_city:     { label: 'Cidade do imóvel',        color: 'bg-cyan-100 text-cyan-700' },
  awaiting_property_state:    { label: 'Estado do imóvel (UF)',   color: 'bg-cyan-100 text-cyan-700' },

  // ── Veículo ───────────────────────────────────────────────────────────────
  awaiting_vehicle_type:      { label: 'Tipo do veículo',         color: 'bg-sky-100 text-sky-700' },
  awaiting_vehicle_value:     { label: 'Valor do veículo',        color: 'bg-sky-100 text-sky-700' },
  awaiting_vehicle_year:      { label: 'Ano do veículo',          color: 'bg-sky-100 text-sky-700' },
  awaiting_vehicle_down_payment: { label: 'Entrada do veículo',   color: 'bg-sky-100 text-sky-700' },

  // ── Crédito pessoal / consignado / empresa ───────────────────────────────
  awaiting_loan_amount:       { label: 'Valor do empréstimo',     color: 'bg-violet-100 text-violet-700' },
  awaiting_employment_type:   { label: 'Tipo de emprego',         color: 'bg-violet-100 text-violet-700' },
  awaiting_employer:          { label: 'Empregador',              color: 'bg-violet-100 text-violet-700' },
  awaiting_company_cnpj:      { label: 'CNPJ da empresa',         color: 'bg-violet-100 text-violet-700' },
  awaiting_company_revenue:   { label: 'Faturamento da empresa',  color: 'bg-violet-100 text-violet-700' },
  awaiting_loan_purpose:      { label: 'Finalidade do crédito',   color: 'bg-violet-100 text-violet-700' },
  awaiting_term:              { label: 'Prazo (meses)',            color: 'bg-violet-100 text-violet-700' },

  // ── Finais ────────────────────────────────────────────────────────────────
  simulation_ready:           { label: 'Simulação pronta',        color: 'bg-green-100 text-green-700' },
  human_handoff:              { label: 'Aguardando atendimento',  color: 'bg-yellow-100 text-yellow-700' },
  completed:                  { label: 'Concluído',               color: 'bg-emerald-100 text-emerald-700' },
  abandoned:                  { label: 'Abandonado',              color: 'bg-red-100 text-red-700' },

  // ── Legados (manter compatibilidade) ─────────────────────────────────────
  new:                        { label: 'Novo',                    color: 'bg-gray-100 text-gray-600' },
  awaiting_menu:              { label: 'No menu',                 color: 'bg-blue-100 text-blue-700' },
  awaiting_hab_type:          { label: 'Selecionando habitação',  color: 'bg-blue-100 text-blue-700' },
  awaiting_vehicle_model:     { label: 'Selecionando veículo',    color: 'bg-blue-100 text-blue-700' },
  in_flow:                    { label: 'Em captação',             color: 'bg-purple-100 text-purple-700' },
  human:                      { label: 'Atendimento humano',      color: 'bg-yellow-100 text-yellow-700' },
}
