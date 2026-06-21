/**
 * Full pipeline tests: router → Compor Mensagem → WhatsApp payload validation.
 * Every step of every conversation flow is tested end-to-end.
 * Catches WhatsApp API constraint violations (title length, button count, etc.)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const wf = JSON.parse(readFileSync(join(__dir, '../n8n/workflows/01-bot-financiamento.json'), 'utf8'))
const codes = Object.fromEntries(
  wf.nodes.filter(n => n.type === 'n8n-nodes-base.code').map(n => [n.name, n.parameters.jsCode])
)

const PHONE       = '5516993056772'
const PHONE_ID    = '1129051206965973'
const WA_VERSION  = 'v21.0'

const $env = {
  API_BASE_URL:          'http://localhost:3333',
  API_INTERNAL_TOKEN:    'MOCK_INTERNAL_TOKEN',
  WHATSAPP_ACCESS_TOKEN: 'MOCK_WA_TOKEN',
  WHATSAPP_API_VERSION:  WA_VERSION,
}

// ── WhatsApp API constraint limits ────────────────────────────────────────────
const WA_LIMITS = {
  BUTTON_TITLE:       20,   // button reply title
  BUTTON_COUNT:        3,   // max buttons per message
  LIST_BUTTON_TEXT:   20,   // text on the button that opens the list
  LIST_ROW_TITLE:     24,   // list item title
  LIST_ROW_DESC:      72,   // list item description
  LIST_ROWS_TOTAL:    10,   // max rows across all sections
  INTERACTIVE_BODY: 1024,   // interactive body text
  TEXT_BODY:        4096,   // plain text body
}

// ── Validate waMessage against WhatsApp API constraints ───────────────────────
function validateWaMessage(waMessage, label) {
  const errors = []

  if (!waMessage) {
    errors.push('waMessage é null/undefined')
    return errors
  }

  if (waMessage.type === 'text') {
    const body = waMessage.text?.body ?? ''
    if (body.length === 0) errors.push('text.body vazio')
    if (body.length > WA_LIMITS.TEXT_BODY)
      errors.push(`text.body muito longo: ${body.length} chars (max ${WA_LIMITS.TEXT_BODY})`)
    return errors
  }

  if (waMessage.type === 'interactive') {
    const iv = waMessage.interactive
    if (!iv) { errors.push('interactive ausente'); return errors }

    const bodyText = iv.body?.text ?? ''
    if (bodyText.length === 0) errors.push('interactive.body.text vazio')
    if (bodyText.length > WA_LIMITS.INTERACTIVE_BODY)
      errors.push(`interactive.body.text muito longo: ${bodyText.length} chars (max ${WA_LIMITS.INTERACTIVE_BODY})`)

    if (iv.type === 'button') {
      const buttons = iv.action?.buttons ?? []
      if (buttons.length === 0) errors.push('nenhum botão')
      if (buttons.length > WA_LIMITS.BUTTON_COUNT)
        errors.push(`muitos botões: ${buttons.length} (max ${WA_LIMITS.BUTTON_COUNT})`)
      for (const btn of buttons) {
        const title = btn.reply?.title ?? ''
        const id    = btn.reply?.id    ?? ''
        if (!id)    errors.push(`botão sem id: "${title}"`)
        if (title.length === 0) errors.push('botão sem título')
        if (title.length > WA_LIMITS.BUTTON_TITLE)
          errors.push(`título de botão longo (${title.length}>${WA_LIMITS.BUTTON_TITLE}): "${title}"`)
      }
    }

    if (iv.type === 'list') {
      const btnText   = iv.action?.button ?? ''
      const sections  = iv.action?.sections ?? []
      if (btnText.length === 0) errors.push('list action.button vazio')
      if (btnText.length > WA_LIMITS.LIST_BUTTON_TEXT)
        errors.push(`list button text longo (${btnText.length}>${WA_LIMITS.LIST_BUTTON_TEXT}): "${btnText}"`)

      let totalRows = 0
      for (const sec of sections) {
        for (const row of (sec.rows ?? [])) {
          totalRows++
          const title = row.title ?? ''
          const desc  = row.description ?? ''
          if (!row.id)   errors.push(`item de lista sem id: "${title}"`)
          if (title.length === 0) errors.push('item de lista sem título')
          if (title.length > WA_LIMITS.LIST_ROW_TITLE)
            errors.push(`título de item longo (${title.length}>${WA_LIMITS.LIST_ROW_TITLE}): "${title}"`)
          if (desc.length > WA_LIMITS.LIST_ROW_DESC)
            errors.push(`descrição de item longa (${desc.length}>${WA_LIMITS.LIST_ROW_DESC}): "${desc}"`)
        }
      }
      if (totalRows === 0) errors.push('lista sem itens')
      if (totalRows > WA_LIMITS.LIST_ROWS_TOTAL)
        errors.push(`muitos itens na lista: ${totalRows} (max ${WA_LIMITS.LIST_ROWS_TOTAL})`)
    }

    return errors
  }

  errors.push(`tipo de mensagem desconhecido: "${waMessage.type}"`)
  return errors
}

// ── Run Compor Mensagem node ──────────────────────────────────────────────────
function runComporMensagem(routerJson) {
  const makeRef = (json) => ({ first: () => ({ json }), all: () => [{ json }] })
  const $ = (name) => {
    if (name === 'Roteador de Conversa') return makeRef(routerJson)
    throw new Error(`Compor Mensagem: node desconhecido "${name}"`)
  }
  const fn = new Function('$input', '$', '$env', `return (async () => { ${codes['Compor Mensagem']} })()`)
  return fn(makeRef({}), $, $env)
}

// ── Run Roteador de Conversa node ─────────────────────────────────────────────
function runRouter(text, currentState, ctx = {}) {
  const sessionRow    = currentState === 'new' ? {} : { current_state: currentState, context: JSON.stringify(ctx) }
  const extractedJson = { phone: PHONE, incomingText: text.toLowerCase().trim(), rawText: text.trim(), messageId: 'test-msg-id', phoneNumberId: PHONE_ID }
  const makeRef = (json) => ({ first: () => ({ json }), all: () => [{ json }] })
  const $ = (name) => {
    if (name === 'Extrair Mensagem') return makeRef(extractedJson)
    if (name === 'Buscar Sessão')    return makeRef(sessionRow)
    throw new Error(`Router: node desconhecido "${name}"`)
  }
  const fn = new Function('$input', '$', '$env', codes['Roteador de Conversa'])
  const result = fn(makeRef({}), $, $env)
  if (!result || result.length === 0) throw new Error(`Router retornou vazio para: "${text}" @ ${currentState}`)
  return result[0].json
}

// ── Test counter ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0, totalSteps = 0, payloadErrors = 0

// ── Run one step: router + Compor Mensagem + WA validation ───────────────────
async function step(text, state, ctx) {
  totalSteps++
  const router  = runRouter(text, state, ctx)
  const composed = await runComporMensagem(router)

  if (!composed || composed.length === 0) throw new Error(`Compor Mensagem retornou vazio`)
  const { waMessage } = composed[0].json

  const errs = validateWaMessage(waMessage, `[${state}] "${text}"`)
  if (errs.length > 0) {
    for (const e of errs) {
      console.error(`    🚨 PAYLOAD INVÁLIDO: ${e}`)
      payloadErrors++
    }
  }

  const preview = router.response?.replace(/\n/g, ' ').slice(0, 70)
  const waType  = waMessage?.interactive ? `(${waMessage.interactive.type})` : `(text)`
  console.log(`  [${state}] "${text}" → ${router.newState} ${waType}`)
  if (errs.length > 0) console.log(`    response: ${preview}`)

  return { router, waMessage }
}

// ── Scenario runner ───────────────────────────────────────────────────────────
async function scenario(name, steps) {
  console.log(`\n${'═'.repeat(65)}`)
  console.log(`  ${name}`)
  console.log('═'.repeat(65))

  let state = 'new', ctx = {}
  try {
    for (const [text, expectedState] of steps) {
      const { router } = await step(text, state, ctx)
      const gotState = router.newState
      ctx   = router.newContext ?? router.ctx ?? {}
      state = gotState

      if (expectedState && gotState !== expectedState) {
        throw new Error(`Estado esperado "${expectedState}", mas obteve "${gotState}"`)
      }
    }
    console.log(`\n  ✅ PASSOU`)
    passed++
  } catch (e) {
    console.error(`\n  ❌ FALHOU: ${e.message}`)
    failed++
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CENÁRIOS COMPLETOS
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Imobiliário PF — caminho completo ──────────────────────────────────────
await scenario('Imobiliário PF — fluxo completo', [
  ['oi',                  'awaiting_financing_type'],
  ['1',                   'awaiting_person_type'],       // imóvel
  ['1',                   'awaiting_name'],               // PF
  ['Anderson Silva',      'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['15/06/1990',          'awaiting_civil_status'],
  ['2',                   'awaiting_email'],              // casado
  ['anderson@email.com',  'awaiting_phone'],
  ['16993056772',         'awaiting_city'],
  ['Ribeirão Preto',      'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['8000',                'awaiting_co_participant'],
  ['2',                   'awaiting_re_objective'],       // sem co-participante
  ['1',                   'awaiting_purchase_timeline'],  // financiar imóvel
  ['1',                   'awaiting_fgts'],               // imediato
  ['1',                   'awaiting_fgts_amount'],        // tem FGTS
  ['20000',               'awaiting_down_payment'],
  ['1',                   'awaiting_down_payment_amount'],// tem entrada
  ['30000',               'awaiting_property_value'],
  ['400000',              'awaiting_property_type'],
  ['1',                   'awaiting_property_city'],      // residencial
  ['São Paulo',           'awaiting_property_state'],
  ['SP',                  'awaiting_include_fees'],
  ['1',                   'awaiting_term'],               // incluir taxas
  ['10',                  'simulation_ready'],            // 360 meses
])

// ── 2. Imobiliário PF — sem FGTS, sem entrada ────────────────────────────────
await scenario('Imobiliário PF — sem FGTS e sem entrada', [
  ['oi',                  'awaiting_financing_type'],
  ['1',                   'awaiting_person_type'],
  ['1',                   'awaiting_name'],
  ['Maria Oliveira',      'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['01/01/1985',          'awaiting_civil_status'],
  ['1',                   'awaiting_email'],              // solteira
  ['maria@email.com',     'awaiting_phone'],
  ['11987654321',         'awaiting_city'],
  ['São Paulo',           'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['6000',                'awaiting_co_participant'],
  ['2',                   'awaiting_re_objective'],       // sem co-participante
  ['1',                   'awaiting_purchase_timeline'],
  ['1',                   'awaiting_fgts'],               // imediato
  ['2',                   'awaiting_down_payment'],       // sem FGTS
  ['2',                   'awaiting_property_value'],     // sem entrada
  ['350000',              'awaiting_property_type'],
  ['1',                   'awaiting_property_city'],
  ['Campinas',            'awaiting_property_state'],
  ['SP',                  'awaiting_include_fees'],
  ['2',                   'awaiting_term'],               // sem taxas
  ['9',                   'simulation_ready'],            // 240 meses
])

// ── 3. Imobiliário PJ ────────────────────────────────────────────────────────
// PJ: phone → company_revenue → loan_amount → employment_type (skips city/state/income/RE states)
await scenario('Imobiliário PJ — fluxo completo', [
  ['oi',                    'awaiting_financing_type'],
  ['1',                     'awaiting_person_type'],
  ['2',                     'awaiting_company_name'],      // PJ
  ['Construtora ABC Ltda',  'awaiting_cnpj'],
  ['11222333000181',        'awaiting_responsible_name'],
  ['Carlos Mendes',         'awaiting_email'],
  ['carlos@abc.com',        'awaiting_phone'],
  ['11912345678',           'awaiting_company_revenue'],   // PJ pula cidade/estado/renda
  ['300000',                'awaiting_loan_amount'],
  ['800000',                'awaiting_employment_type'],   // imobiliário vai direto para emprego
  ['2',                     'awaiting_employer'],          // servidor público
  ['Empresa Construtora',   'awaiting_term'],
  ['8',                     'simulation_ready'],           // 180 meses
])

// ── 4. Veículo PF — carro completo ───────────────────────────────────────────
await scenario('Veículo PF — carro completo', [
  ['oi',                  'awaiting_financing_type'],
  ['2',                   'awaiting_person_type'],        // veículo
  ['1',                   'awaiting_name'],               // PF
  ['Pedro Costa',         'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['10/05/1992',          'awaiting_civil_status'],
  ['1',                   'awaiting_email'],              // solteiro
  ['pedro@email.com',     'awaiting_phone'],
  ['16988776655',         'awaiting_city'],
  ['Ribeirão Preto',      'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['5500',                'awaiting_co_participant'],
  ['2',                   'awaiting_vehicle_type'],       // sem co-participante
  ['1',                   'awaiting_vehicle_brand'],      // carro
  ['Toyota',              'awaiting_vehicle_model'],
  ['Corolla',             'awaiting_vehicle_year'],
  ['2022',                'awaiting_vehicle_fuel'],
  ['1',                   'awaiting_seller_context'],     // flex
  ['2',                   'awaiting_purchase_intent'],    // concessionária
  ['1',                   'awaiting_cnh'],                // comprando
  ['1',                   'awaiting_residence_state'],    // tem CNH
  ['SP',                  'awaiting_vehicle_value'],
  ['85000',               'awaiting_vehicle_down_payment'],
  ['1',                   'awaiting_down_payment_amount'], // tem entrada
  ['15000',               'awaiting_term'],               // valor da entrada
  ['5',                   'simulation_ready'],            // 60 meses
])

// ── 5. Veículo PF — sem entrada ──────────────────────────────────────────────
await scenario('Veículo PF — sem entrada', [
  ['oi',                  'awaiting_financing_type'],
  ['carro',               'awaiting_person_type'],
  ['pf',                  'awaiting_name'],
  ['Julia Martins',       'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['20/03/1995',          'awaiting_civil_status'],
  ['1',                   'awaiting_email'],
  ['julia@email.com',     'awaiting_phone'],
  ['11999887766',         'awaiting_city'],
  ['Campinas',            'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['4500',                'awaiting_co_participant'],
  ['2',                   'awaiting_vehicle_type'],
  ['1',                   'awaiting_vehicle_brand'],
  ['Honda',               'awaiting_vehicle_model'],
  ['Civic',               'awaiting_vehicle_year'],
  ['2021',                'awaiting_vehicle_fuel'],
  ['1',                   'awaiting_seller_context'],
  ['1',                   'awaiting_purchase_intent'],
  ['1',                   'awaiting_cnh'],
  ['1',                   'awaiting_residence_state'],
  ['SP',                  'awaiting_vehicle_value'],
  ['70000',               'awaiting_vehicle_down_payment'],
  ['2',                   'awaiting_term'],               // sem entrada
  ['3',                   'simulation_ready'],            // 36 meses
])

// ── 6. Crédito Pessoal PF — CLT ──────────────────────────────────────────────
await scenario('Crédito Pessoal PF — CLT', [
  ['oi',                  'awaiting_financing_type'],
  ['3',                   'awaiting_person_type'],
  ['1',                   'awaiting_name'],
  ['João Pedro Santos',   'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['10/10/1992',          'awaiting_civil_status'],
  ['1',                   'awaiting_email'],
  ['joao@email.com',      'awaiting_phone'],
  ['21988776655',         'awaiting_city'],
  ['Rio de Janeiro',      'awaiting_state'],
  ['RJ',                  'awaiting_monthly_income'],
  ['4500',                'awaiting_co_participant'],
  ['2',                   'awaiting_loan_amount'],
  ['15000',               'awaiting_employment_type'],
  ['1',                   'awaiting_employer'],           // CLT
  ['Empresa XYZ',         'awaiting_term'],
  ['3',                   'simulation_ready'],            // 36 meses
])

// ── 7. Crédito Pessoal PF — Autônomo ─────────────────────────────────────────
await scenario('Crédito Pessoal PF — Autônomo', [
  ['oi',                  'awaiting_financing_type'],
  ['pessoal',             'awaiting_person_type'],
  ['1',                   'awaiting_name'],
  ['Lúcia Ferreira',      'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['05/05/1980',          'awaiting_civil_status'],
  ['3',                   'awaiting_email'],              // divorciada
  ['lucia@email.com',     'awaiting_phone'],
  ['11944556677',         'awaiting_city'],
  ['Santos',              'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['3800',                'awaiting_co_participant'],
  ['2',                   'awaiting_loan_amount'],
  ['8000',                'awaiting_employment_type'],
  ['3',                   'awaiting_employer'],           // autônomo
  ['Freelancer',          'awaiting_term'],
  ['2',                   'simulation_ready'],            // 24 meses
])

// ── 8. Consignado ─────────────────────────────────────────────────────────────
await scenario('Consignado — Servidor Público', [
  ['oi',                  'awaiting_financing_type'],
  ['4',                   'awaiting_person_type'],        // consignado
  ['1',                   'awaiting_name'],
  ['Roberto Alves',       'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['12/12/1975',          'awaiting_civil_status'],
  ['2',                   'awaiting_email'],
  ['roberto@gov.br',      'awaiting_phone'],
  ['61999887766',         'awaiting_city'],
  ['Brasília',            'awaiting_state'],
  ['DF',                  'awaiting_monthly_income'],
  ['9000',                'awaiting_co_participant'],
  ['2',                   'awaiting_loan_amount'],
  ['25000',               'awaiting_employment_type'],
  ['2',                   'awaiting_employer'],           // servidor público
  ['Ministério X',        'awaiting_term'],
  ['4',                   'simulation_ready'],            // 48 meses
])

// ── 9. Empresa PJ ─────────────────────────────────────────────────────────────
// PJ: phone → company_revenue → loan_amount → loan_purpose → employment_type
await scenario('Empresa PJ — capital de giro', [
  ['oi',                        'awaiting_financing_type'],
  ['5',                         'awaiting_person_type'],
  ['2',                         'awaiting_company_name'],
  ['Tech Solutions Ltda',       'awaiting_cnpj'],
  ['11222333000181',            'awaiting_responsible_name'],
  ['Carlos Roberto Lima',       'awaiting_email'],
  ['carlos@techsolutions.com',  'awaiting_phone'],
  ['11987654321',               'awaiting_company_revenue'],  // PJ pula cidade/estado/renda
  ['150000',                    'awaiting_loan_amount'],
  ['500000',                    'awaiting_loan_purpose'],      // empresa → finalidade
  ['capital de giro',           'awaiting_employment_type'],
  ['4',                         'awaiting_employer'],          // empresário
  ['Tech Solutions',            'awaiting_term'],
  ['2',                         'simulation_ready'],           // 24 meses
])

// ── 10. Equipamento ───────────────────────────────────────────────────────────
await scenario('Financiamento de Equipamento PF', [
  ['oi',                  'awaiting_financing_type'],
  ['6',                   'awaiting_person_type'],        // equipamento
  ['1',                   'awaiting_name'],
  ['Fabio Souza',         'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['20/07/1988',          'awaiting_civil_status'],
  ['1',                   'awaiting_email'],
  ['fabio@email.com',     'awaiting_phone'],
  ['11933445566',         'awaiting_city'],
  ['Guarulhos',           'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['7000',                'awaiting_co_participant'],
  ['2',                   'awaiting_loan_amount'],
  ['80000',               'awaiting_loan_purpose'],
  ['compra de equipamento','awaiting_employment_type'],
  ['1',                   'awaiting_employer'],           // CLT
  ['Empresa ABC',         'awaiting_term'],
  ['5',                   'simulation_ready'],            // 60 meses
])

// ── 11. Rural ─────────────────────────────────────────────────────────────────
await scenario('Crédito Rural PF', [
  ['oi',                  'awaiting_financing_type'],
  ['rural',               'awaiting_person_type'],        // rural
  ['1',                   'awaiting_name'],
  ['Marcos Pereira',      'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['10/10/1970',          'awaiting_civil_status'],
  ['2',                   'awaiting_email'],
  ['marcos@fazenda.com',  'awaiting_phone'],
  ['17988776655',         'awaiting_city'],
  ['Barretos',            'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['12000',               'awaiting_co_participant'],
  ['2',                   'awaiting_loan_amount'],
  ['200000',              'awaiting_employment_type'],
  ['4',                   'awaiting_employer'],           // empresário
  ['Fazenda São João',    'awaiting_term'],
  ['6',                   'simulation_ready'],            // 84 meses
])

// ── 12. Co-participante presente ─────────────────────────────────────────────
await scenario('Imobiliário PF — com co-participante', [
  ['oi',                  'awaiting_financing_type'],
  ['1',                   'awaiting_person_type'],
  ['1',                   'awaiting_name'],
  ['Ana Lima',            'awaiting_cpf'],
  ['529.982.247-25',      'awaiting_birth_date'],
  ['01/01/1990',          'awaiting_civil_status'],
  ['2',                   'awaiting_email'],
  ['ana@email.com',       'awaiting_phone'],
  ['11987654321',         'awaiting_city'],
  ['São Paulo',           'awaiting_state'],
  ['SP',                  'awaiting_monthly_income'],
  ['5000',                'awaiting_co_participant'],
  ['1',                   'awaiting_co_participant_income'],// com co-participante
  ['3500',                'awaiting_re_objective'],
  ['1',                   'awaiting_purchase_timeline'],
  ['1',                   'awaiting_fgts'],
  ['2',                   'awaiting_down_payment'],       // sem FGTS
  ['2',                   'awaiting_property_value'],     // sem entrada
  ['450000',              'awaiting_property_type'],
  ['1',                   'awaiting_property_city'],
  ['São Paulo',           'awaiting_property_state'],
  ['SP',                  'awaiting_include_fees'],
  ['1',                   'awaiting_term'],
  ['9',                   'simulation_ready'],            // 240 meses
])

// ── 13. Fluxo de cancelamento ─────────────────────────────────────────────────
await scenario('Cancelamento no meio do fluxo', [
  ['oi',          'awaiting_financing_type'],
  ['1',           'awaiting_person_type'],
  ['1',           'awaiting_name'],
  ['Teste User',  'awaiting_cpf'],
  ['cancelar',    'abandoned'],
])

// ── 14. Recomeçar ─────────────────────────────────────────────────────────────
await scenario('Recomeçar no meio do fluxo', [
  ['oi',          'awaiting_financing_type'],
  ['1',           'awaiting_person_type'],
  ['1',           'awaiting_name'],
  ['Teste User',  'awaiting_cpf'],
  ['recomeçar',   'awaiting_financing_type'],
  ['2',           'awaiting_person_type'],               // veículo desta vez
  ['1',           'awaiting_name'],
])

// ── 15. Inputs inválidos — manter estado ─────────────────────────────────────
await scenario('Inputs inválidos — devem manter estado', [
  ['oi',              'awaiting_financing_type'],
  ['9',               'awaiting_financing_type'],  // opção inválida
  ['abc',             'awaiting_financing_type'],  // texto inválido
  ['1',               'awaiting_person_type'],
  ['3',               'awaiting_person_type'],     // opção inválida (só 1 ou 2)
  ['1',               'awaiting_name'],
  ['Jo',              'awaiting_name'],             // nome muito curto (< 2 palavras)
  ['João Silva',      'awaiting_cpf'],
  ['12345',           'awaiting_cpf'],              // CPF formato inválido
  ['000.000.000-00',  'awaiting_cpf'],              // CPF todos dígitos iguais
  ['529.982.247-25',  'awaiting_birth_date'],       // CPF válido
  ['32/01/1990',      'awaiting_birth_date'],       // dia inválido (dia 32)
  ['01/13/1990',      'awaiting_birth_date'],       // mês inválido (mês 13)
  ['31/02/1990',      'awaiting_birth_date'],       // data impossível (fev 31)
  ['01/01/2010',      'awaiting_birth_date'],       // menor de idade (16 anos)
  ['15/06/1990',      'awaiting_civil_status'],     // data válida, maior de idade
])

// ── 16. Pós-simulação — aceitar consultor ────────────────────────────────────
await scenario('Pós-simulação — aceitar consultor', [
  ['oi',              'awaiting_financing_type'],
  ['1',               'awaiting_person_type'],
  ['1',               'awaiting_name'],
  ['Teste Final',     'awaiting_cpf'],
  ['529.982.247-25',  'awaiting_birth_date'],
  ['01/01/1990',      'awaiting_civil_status'],
  ['1',               'awaiting_email'],
  ['t@email.com',     'awaiting_phone'],
  ['11999999999',     'awaiting_city'],
  ['São Paulo',       'awaiting_state'],
  ['SP',              'awaiting_monthly_income'],
  ['8000',            'awaiting_co_participant'],
  ['2',               'awaiting_re_objective'],
  ['1',               'awaiting_purchase_timeline'],
  ['1',               'awaiting_fgts'],
  ['2',               'awaiting_down_payment'],
  ['2',               'awaiting_property_value'],
  ['300000',          'awaiting_property_type'],
  ['1',               'awaiting_property_city'],
  ['Campinas',        'awaiting_property_state'],
  ['SP',              'awaiting_include_fees'],
  ['2',               'awaiting_term'],
  ['8',               'simulation_ready'],
  ['1',               'human_handoff'],             // sim, quero consultor
])

// ── 17. Pós-simulação — recusar consultor ────────────────────────────────────
await scenario('Pós-simulação — recusar consultor', [
  ['oi',              'awaiting_financing_type'],
  ['1',               'awaiting_person_type'],
  ['1',               'awaiting_name'],
  ['Teste Final',     'awaiting_cpf'],
  ['529.982.247-25',  'awaiting_birth_date'],
  ['01/01/1990',      'awaiting_civil_status'],
  ['1',               'awaiting_email'],
  ['t@email.com',     'awaiting_phone'],
  ['11999999999',     'awaiting_city'],
  ['São Paulo',       'awaiting_state'],
  ['SP',              'awaiting_monthly_income'],
  ['8000',            'awaiting_co_participant'],
  ['2',               'awaiting_re_objective'],
  ['1',               'awaiting_purchase_timeline'],
  ['1',               'awaiting_fgts'],
  ['2',               'awaiting_down_payment'],
  ['2',               'awaiting_property_value'],
  ['300000',          'awaiting_property_type'],
  ['1',               'awaiting_property_city'],
  ['Campinas',        'awaiting_property_state'],
  ['SP',              'awaiting_include_fees'],
  ['2',               'awaiting_term'],
  ['8',               'simulation_ready'],
  ['2',               'completed'],                 // não, obrigado
])

// ── Resultado final ───────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(65)}`)
console.log(`  Cenários: ${passed} ✅  ${failed} ❌   Passos: ${totalSteps}   Erros de payload: ${payloadErrors}`)
console.log('═'.repeat(65))

if (payloadErrors > 0) {
  console.error(`\n🚨 ${payloadErrors} erro(s) de payload WhatsApp detectado(s)!`)
  console.error('   Corrija os títulos/estrutura antes de fazer deploy.')
  process.exit(1)
}

if (failed > 0) {
  process.exit(1)
}
