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
    if (name === 'Formatar Resultado')   return { first: () => ({ json: {} }), all: () => [] }
    throw new Error(`Compor Mensagem: node desconhecido "${name}"`)
  }
  const fn = new Function('$input', '$', '$env', `return (async () => { ${codes['Compor Mensagem']} })()`)
  return fn(makeRef({}), $, $env)
}

// ── Run Roteador de Conversa node ─────────────────────────────────────────────
async function runRouter(text, currentState, ctx = {}, clientData = null) {
  const sessionRow    = currentState === 'new' ? {} : { current_state: currentState, context: JSON.stringify(ctx) }
  const extractedJson = { phone: PHONE, incomingText: text.toLowerCase().trim(), rawText: text.trim(), messageId: 'test-msg-id', phoneNumberId: PHONE_ID }
  const makeRef = (json) => ({ first: () => ({ json }), all: () => [{ json }] })
  const makeNullRef  = () => ({ first: () => ({ json: undefined }), all: () => [] })
  const $ = (name) => {
    if (name === 'Extrair Mensagem') return makeRef(extractedJson)
    if (name === 'Buscar Sessão')    return makeRef(sessionRow)
    if (name === 'Buscar Cliente')   return clientData ? makeRef(clientData) : makeNullRef()
    throw new Error(`Router: node desconhecido "${name}"`)
  }
  const fn = new Function('$input', '$', '$env', `return (async () => { ${codes['Roteador de Conversa']} })()`)
  const result = await fn(makeRef({}), $, $env)
  if (!result || result.length === 0) throw new Error(`Router retornou vazio para: "${text}" @ ${currentState}`)
  return result[0].json
}

// ── Test counter ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0, totalSteps = 0, payloadErrors = 0

// ── Run one step: router + Compor Mensagem + WA validation ───────────────────
async function step(text, state, ctx, clientData) {
  totalSteps++
  const router  = await runRouter(text, state, ctx, clientData)
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
async function scenario(name, steps, { clientData = null } = {}) {
  console.log(`\n${'═'.repeat(65)}`)
  console.log(`  ${name}`)
  console.log('═'.repeat(65))

  let state = 'new', ctx = {}
  try {
    for (const [text, expectedState] of steps) {
      // Buscar Cliente runs once per n8n execution so clientData is always available
      const { router } = await step(text, state, ctx, clientData)
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

// ── 1. Menu → Falar com Atendente ─────────────────────────────────────────────
await scenario('Menu → Atendente (handoff direto)', [
  ['oi', 'awaiting_menu'],
  ['7',  'human_handoff'],
])

// ── 2. Habitacional → Imóvel Pronto ──────────────────────────────────────────
await scenario('Habitacional — Imóvel Pronto', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['1',           'in_flow'],
  ['300000',      'in_flow'],       // valorImovel
  ['60000',       'in_flow'],       // entradaEscolha: digita valor direto (20%)
  ['240',         'in_flow'],       // prazoMeses: 20 anos
  ['novo',        'in_flow'],       // imovelCond
  ['6000',        'in_flow'],       // rendaFamiliar
  ['15/06/1990',  'in_flow'],       // nascimento
  ['sim',         'in_flow'],       // fgts3anos
  ['0',           'in_flow'],       // dependentes
  ['nao',         'awaiting_post_sim_hab'],  // jaTemImovel → dispara simulação
])

// ── 2b. Habitacional → Imóvel Pronto (via opção % da lista) ──────────────────
await scenario('Habitacional — Imóvel Pronto (entrada via lista %)', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['1',           'in_flow'],
  ['300000',      'in_flow'],       // valorImovel
  ['outro',       'in_flow'],       // entradaEscolha: clica "Digitar valor"
  ['75000',       'in_flow'],       // entrada manual: R$ 75.000 (25%)
  ['240',         'in_flow'],       // prazoMeses
  ['novo',        'in_flow'],       // imovelCond
  ['6000',        'in_flow'],       // rendaFamiliar
  ['15/06/1990',  'in_flow'],       // nascimento
  ['sim',         'in_flow'],       // fgts3anos
  ['0',           'in_flow'],       // dependentes
  ['nao',         'awaiting_post_sim_hab'],
])

// ── 2c. Validação entrada — zero e negativo rejeitados ───────────────────────
await scenario('Validação entrada — zero rejeitado', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['1',           'in_flow'],
  ['300000',      'in_flow'],       // valorImovel
  ['outro',       'in_flow'],       // entradaEscolha: digitar
  ['0',           'in_flow'],       // entrada 0 → inválido, re-pergunta
  ['-5000',       'in_flow'],       // entrada negativa → inválido, re-pergunta
  ['60000',       'in_flow'],       // entrada válida (20%)
  ['240',         'in_flow'],
  ['novo',        'in_flow'],
  ['6000',        'in_flow'],
  ['15/06/1990',  'in_flow'],
  ['sim',         'in_flow'],
  ['0',           'in_flow'],
  ['nao',         'awaiting_post_sim_hab'],
])

// ── 2d. Validação entrada — abaixo de 20% rejeitado ──────────────────────────
await scenario('Validação entrada — abaixo de 20% rejeitado', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['1',           'in_flow'],
  ['300000',      'in_flow'],       // valorImovel (20% = 60000)
  ['outro',       'in_flow'],       // entradaEscolha: digitar
  ['30000',       'in_flow'],       // entrada < 20% (30000 < 60000) → rejeitado
  ['60000',       'in_flow'],       // entrada válida (20% exato)
  ['240',         'in_flow'],
  ['novo',        'in_flow'],
  ['6000',        'in_flow'],
  ['15/06/1990',  'in_flow'],
  ['sim',         'in_flow'],
  ['0',           'in_flow'],
  ['nao',         'awaiting_post_sim_hab'],
])

// ── 3. Habitacional → Construção ─────────────────────────────────────────────
await scenario('Habitacional — Construção', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['2',           'in_flow'],
  ['proprio',     'in_flow'],
  ['80000',       'in_flow'],
  ['200000',      'in_flow'],
  ['240',         'in_flow'],       // prazoMeses: 20 anos
  ['7000',        'in_flow'],
  ['20/03/1985',  'in_flow'],
  ['nao',         'in_flow'],
  ['1',           'awaiting_post_sim_hab'],
])

// ── 4. Habitacional → Terreno ────────────────────────────────────────────────
await scenario('Habitacional — Terreno', [
  ['oi',          'awaiting_menu'],
  ['1',           'awaiting_hab_type'],
  ['3',           'in_flow'],
  ['90000',       'in_flow'],
  ['120',         'in_flow'],       // prazoMeses: 10 anos
  ['5000',        'in_flow'],
  ['10/03/1988',  'in_flow'],
  ['nao',         'in_flow'],
  ['0',           'awaiting_post_sim_hab'],
])

// ── 5. Consórcio (veículo) ───────────────────────────────────────────────────
await scenario('Consórcio — Veículo', [
  ['oi',              'awaiting_menu'],
  ['2',               'in_flow'],
  ['veiculo',         'in_flow'],
  ['50000',           'in_flow'],
  ['Anderson Silva',  'human_handoff'],
])

// ── 6. Consignado ────────────────────────────────────────────────────────────
await scenario('Consignado — CLT', [
  ['oi',          'awaiting_menu'],
  ['3',           'in_flow'],
  ['clt',         'in_flow'],
  ['20000',       'in_flow'],
  ['nao',         'in_flow'],
  ['Maria Souza', 'human_handoff'],
])

// ── 7. Garantia de Imóvel ────────────────────────────────────────────────────
await scenario('Empréstimo com Garantia de Imóvel', [
  ['oi',          'awaiting_menu'],
  ['4',           'in_flow'],
  ['500000',      'in_flow'],
  ['sim',         'in_flow'],
  ['100000',      'in_flow'],
  ['8000',        'in_flow'],
  ['Carlos Dias', 'human_handoff'],
])

// ── 8. Abertura de Conta ─────────────────────────────────────────────────────
await scenario('Abertura de Conta', [
  ['oi',                'awaiting_menu'],
  ['5',                 'in_flow'],
  ['Joao Lima',         'in_flow'],
  ['529.982.247-25',    'in_flow'],
  ['São Paulo',         'human_handoff'],
])

// ── 9. Crédito Real Fácil ────────────────────────────────────────────────────
await scenario('Crédito Real Fácil', [
  ['oi',        'awaiting_menu'],
  ['6',         'in_flow'],
  ['Ana Costa', 'in_flow'],
  ['15000',     'in_flow'],
  ['5000',      'human_handoff'],
])

// ── 10. Validação — valor inválido re-pergunta ───────────────────────────────
await scenario('Validação — valor inválido re-pergunta', [
  ['oi',        'awaiting_menu'],
  ['6',         'in_flow'],
  ['Ana Costa', 'in_flow'],
  ['abc',       'in_flow'],
  ['15000',     'in_flow'],
  ['5000',      'human_handoff'],
])

// ── 11. Menu inválido ────────────────────────────────────────────────────────
await scenario('Menu inválido', [
  ['oi', 'awaiting_menu'],
  ['99', 'awaiting_menu'],
])

// ── 12. Retornante pula o nome ───────────────────────────────────────────────
const RETURNING_CLIENT = {
  person_type: 'pf', name: 'Anderson Silva', cpf_encrypted: '52998224725',
  birth_date: '1990-06-15', civil_status: 'casado', phone: '16993056772',
  email: 'anderson@email.com', city: 'Ribeirão Preto', state: 'SP',
  monthly_income_encrypted: '8000', has_co_participant: false,
  co_participant_income_encrypted: null, company_name: null, cnpj_encrypted: null,
  responsible_name: null, company_revenue_encrypted: null,
}
await scenario('Retornante — Consórcio (pula o nome)', [
  ['oi',       'awaiting_menu'],
  ['2',        'in_flow'],
  ['veiculo',  'in_flow'],
  ['50000',    'human_handoff'],
], { clientData: RETURNING_CLIENT })

// ── 13. Cancelar ─────────────────────────────────────────────────────────────
await scenario('Cancelar no meio do fluxo', [
  ['oi',       'awaiting_menu'],
  ['3',        'in_flow'],
  ['cancelar', 'completed'],
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
