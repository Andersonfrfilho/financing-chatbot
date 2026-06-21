/**
 * Full state machine walkthrough test.
 * Simulates complete conversations for each financing type.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const wf = JSON.parse(readFileSync(join(__dir, '../n8n/workflows/01-bot-financiamento.json'), 'utf8'))
const codes = Object.fromEntries(
  wf.nodes.filter(n => n.type === 'n8n-nodes-base.code').map(n => [n.name, n.parameters.jsCode])
)

const PHONE = '5516993056772'
const PHONE_NUM_ID = '1129051206965973'

function makeNodeRef(json) { return { first: () => ({ json }), all: () => [{ json }] } }

function runRouter(text, currentState, ctx = {}) {
  const sessionRow = currentState === 'new' ? {} : { current_state: currentState, context: JSON.stringify(ctx) }
  const extractedJson = { phone: PHONE, incomingText: text.toLowerCase().trim(), rawText: text.trim(), messageId: 'test', phoneNumberId: PHONE_NUM_ID }
  const $ = (name) => {
    if (name === 'Extrair Mensagem') return makeNodeRef(extractedJson)
    if (name === 'Buscar Sessão')    return makeNodeRef(sessionRow)
    throw new Error(`Unknown node: ${name}`)
  }
  const fn = new Function('$input', '$', codes['Roteador de Conversa'])
  const result = fn(makeNodeRef({}), $)
  if (!result || result.length === 0) throw new Error(`Router returned empty for: "${text}" @ ${currentState}`)
  return result[0].json
}

function step(label, text, state, ctx) {
  const r = runRouter(text, state, ctx)
  const preview = r.response?.replace(/\n/g, ' ').slice(0, 80)
  console.log(`  [${state}] "${text}" → ${r.newState}`)
  console.log(`    💬 ${preview}`)
  if (r.triggerSimulation) console.log(`    🚀 triggerSimulation=true payload keys: ${Object.keys(r.simulationPayload||{}).join(', ')}`)
  return r
}

let passed = 0, failed = 0

function scenario(name, steps) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${name}`)
  console.log('═'.repeat(60))
  let state = 'new', ctx = {}
  try {
    for (const [text, expectedState] of steps) {
      const r = step(name, text, state, ctx)
      state = r.newState
      ctx   = r.newContext ?? r.ctx ?? {}
      if (expectedState && state !== expectedState) {
        console.error(`  ❌ expected state "${expectedState}", got "${state}"`)
        failed++
        return
      }
    }
    console.log(`\n  ✅ PASSOU`)
    passed++
  } catch (e) {
    console.error(`\n  ❌ ERRO: ${e.message}`)
    failed++
  }
}

// ── IMOBILIÁRIO PF ────────────────────────────────────────────────────────────
scenario('Fluxo Imobiliário — Pessoa Física', [
  ['oi',                          'awaiting_financing_type'],
  ['1',                           'awaiting_person_type'],
  ['1',                           'awaiting_name'],
  ['Anderson Silva',              'awaiting_cpf'],
  ['529.982.247-25',              'awaiting_birth_date'],
  ['15/06/1990',                  'awaiting_civil_status'],
  ['2',                           'awaiting_email'],
  ['anderson@email.com',         'awaiting_phone'],
  ['16993056772',                 'awaiting_city'],
  ['Ribeirão Preto',              'awaiting_state'],
  ['SP',                          'awaiting_monthly_income'],
  ['8000',                        'awaiting_co_participant'],
  ['2',                           'awaiting_re_objective'],     // sem co-participante
  ['1',                           'awaiting_purchase_timeline'],
  ['1',                           'awaiting_fgts'],
  ['1',                           'awaiting_fgts_amount'],
  ['20000',                       'awaiting_down_payment'],
  ['1',                           'awaiting_down_payment_amount'],
  ['30000',                       'awaiting_property_value'],
  ['400000',                      'awaiting_property_type'],
  ['1',                           'awaiting_property_city'],
  ['São Paulo',                   'awaiting_property_state'],
  ['SP',                          'awaiting_include_fees'],
  ['2',                           'awaiting_term'],
  ['10',                          'simulation_ready'],          // 360 meses → trigger
])

// ── VEÍCULO PF ────────────────────────────────────────────────────────────────
scenario('Fluxo Veículo — Pessoa Física', [
  ['oi',                          'awaiting_financing_type'],
  ['carro',                       'awaiting_person_type'],
  ['pf',                          'awaiting_name'],
  ['Maria Souza',                 'awaiting_cpf'],
  ['529.982.247-25',              'awaiting_birth_date'],
  ['20/03/1985',                  'awaiting_civil_status'],
  ['1',                           'awaiting_email'],
  ['maria@email.com',            'awaiting_phone'],
  ['11999887766',                 'awaiting_city'],
  ['Campinas',                    'awaiting_state'],
  ['SP',                          'awaiting_monthly_income'],
  ['5000',                        'awaiting_co_participant'],
  ['2',                           'awaiting_vehicle_type'],     // sem co-participante
  ['1',                           'awaiting_vehicle_brand'],    // carro
  ['Toyota',                      'awaiting_vehicle_model'],
  ['Corolla',                     'awaiting_vehicle_year'],
  ['2022',                        'awaiting_vehicle_fuel'],
  ['1',                           'awaiting_seller_context'],   // flex
  ['2',                           'awaiting_purchase_intent'],  // concessionária
  ['1',                           'awaiting_cnh'],              // comprando
  ['1',                           'awaiting_residence_state'],  // tem CNH
  ['SP',                          'awaiting_vehicle_value'],
  ['80000',                       'awaiting_vehicle_down_payment'],
  ['2',                           'awaiting_term'],             // sem entrada
  ['5',                           'simulation_ready'],          // 60 meses → trigger
])

// ── CRÉDITO PESSOAL PF ────────────────────────────────────────────────────────
scenario('Fluxo Crédito Pessoal — Pessoa Física', [
  ['oi',                          'awaiting_financing_type'],
  ['3',                           'awaiting_person_type'],      // pessoal
  ['1',                           'awaiting_name'],
  ['João Pedro Santos',           'awaiting_cpf'],
  ['529.982.247-25',              'awaiting_birth_date'],
  ['10/10/1992',                  'awaiting_civil_status'],
  ['1',                           'awaiting_email'],
  ['joao@email.com',             'awaiting_phone'],
  ['21988776655',                 'awaiting_city'],
  ['Rio de Janeiro',              'awaiting_state'],
  ['RJ',                          'awaiting_monthly_income'],
  ['4500',                        'awaiting_co_participant'],
  ['2',                           'awaiting_loan_amount'],      // sem co-participante
  ['15000',                       'awaiting_employment_type'],
  ['1',                           'awaiting_employer'],         // CLT
  ['Empresa XYZ',                 'awaiting_term'],
  ['3',                           'simulation_ready'],          // 36 meses → trigger
])

// ── PJ ────────────────────────────────────────────────────────────────────────
scenario('Fluxo Empresa — Pessoa Jurídica', [
  ['oi',                          'awaiting_financing_type'],
  ['5',                           'awaiting_person_type'],      // empresa
  ['2',                           'awaiting_company_name'],     // PJ
  ['Tech Solutions Ltda',         'awaiting_cnpj'],
  ['11222333000181',              'awaiting_responsible_name'],
  ['Carlos Roberto Lima',         'awaiting_email'],
  ['carlos@techsolutions.com',   'awaiting_phone'],
  ['11987654321',                 'awaiting_company_revenue'],
  ['150000',                      'awaiting_loan_amount'],
  ['500000',                      'awaiting_loan_purpose'],
  ['capital de giro',             'awaiting_employment_type'],
  ['4',                           'awaiting_employer'],         // empresário
  ['Tech Solutions',              'awaiting_term'],
  ['2',                           'simulation_ready'],          // 24 meses → trigger
])

// ── CANCELAR ──────────────────────────────────────────────────────────────────
scenario('Cancelar no meio do fluxo', [
  ['oi',            'awaiting_financing_type'],
  ['1',             'awaiting_person_type'],
  ['cancelar',      'abandoned'],
])

// ── RECOMEÇAR ─────────────────────────────────────────────────────────────────
scenario('Recomeçar fluxo', [
  ['oi',            'awaiting_financing_type'],
  ['1',             'awaiting_person_type'],
  ['recomeçar',     'awaiting_financing_type'],
])

// ── INPUTS INVÁLIDOS ──────────────────────────────────────────────────────────
scenario('Inputs inválidos — deve manter estado', [
  ['oi',            'awaiting_financing_type'],
  ['9',             'awaiting_financing_type'],   // opção inválida, permanece
  ['1',             'awaiting_person_type'],
  ['3',             'awaiting_person_type'],       // inválido, permanece
  ['1',             'awaiting_name'],
  ['Jo',            'awaiting_name'],              // nome muito curto
  ['João Silva',    'awaiting_cpf'],
  ['12345',         'awaiting_cpf'],               // CPF inválido
  ['529.982.247-25','awaiting_birth_date'],        // CPF válido
])

console.log(`\n${'═'.repeat(60)}`)
console.log(`  Resultado: ${passed} ✅  ${failed} ❌`)
console.log('═'.repeat(60))
if (failed > 0) process.exit(1)
