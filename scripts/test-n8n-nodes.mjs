/**
 * Local simulator for n8n Code nodes.
 * Mocks $input, $(), $env and $helpers so we can test without pushing to n8n.
 * Usage: node scripts/test-n8n-nodes.mjs [message] [state]
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const wf = JSON.parse(readFileSync(join(__dir, '../n8n/workflows/01-bot-financiamento.json'), 'utf8'))
const codes = Object.fromEntries(
  wf.nodes
    .filter(n => n.type === 'n8n-nodes-base.code')
    .map(n => [n.name, n.parameters.jsCode])
)

// ── Mock inputs ────────────────────────────────────────────────────────────────
const INCOMING_TEXT = process.argv[2] ?? 'oi'
const PHONE         = '5516993056772'
const PHONE_NUM_ID  = '1129051206965973'
const CURRENT_STATE = process.argv[3] ?? 'new'
const SESSION_CTX   = {}

// ── Mock $env ─────────────────────────────────────────────────────────────────
const $env = {
  WHATSAPP_ACCESS_TOKEN: 'MOCK_WA_TOKEN',
  WHATSAPP_API_VERSION:  'v19.0',
  API_BASE_URL:          'http://localhost:3333',
  API_INTERNAL_TOKEN:    'MOCK_INTERNAL_TOKEN',
}

// ── Mock $helpers ─────────────────────────────────────────────────────────────
const $helpers = {
  httpRequest: async (opts) => {
    console.log(`  [mock HTTP] ${opts.method} ${opts.url}`)
    if (typeof opts.body === 'object') {
      console.log('  [mock body]', JSON.stringify(opts.body).slice(0, 120))
    }
    if (opts.url?.includes('graph.facebook.com')) {
      return {
        statusCode: 200,
        body: { messaging_product: 'whatsapp', contacts: [{ wa_id: PHONE }], messages: [{ id: 'wamid.mock123' }] },
      }
    }
    if (opts.url?.includes('/api/simulations')) {
      return {
        statusCode: 200,
        body: { parcela: 2450.00, totalFinanciado: 294000, totalJuros: 47600, prazo: 120 },
      }
    }
    throw new Error(`[mock] URL não reconhecida: ${opts.url}`)
  },
}

// ── Helpers to mock n8n API ───────────────────────────────────────────────────
function makeNodeRef(json) {
  const item = { json }
  return { first: () => item, all: () => [item] }
}

// ── Run node with mocked context ──────────────────────────────────────────────
function runNode(name, inputJson, nodeRefs = {}) {
  const $input = makeNodeRef(inputJson)
  const $      = (nodeName) => {
    if (nodeRefs[nodeName]) return makeNodeRef(nodeRefs[nodeName])
    throw new Error(`Node not found in context: ${nodeName}`)
  }
  const $json = inputJson
  const fn = new Function('$input', '$', '$env', '$helpers', '$json', `return (async () => { ${codes[name]} })()`)
  return fn($input, $, $env, $helpers, $json)
}

// ── Step 1: Extrair Mensagem ──────────────────────────────────────────────────
console.log('\n━━━ Extrair Mensagem ━━━')
const webhookBody = {
  body: {
    phone: PHONE,
    messageId: 'wamid.test123',
    text: INCOMING_TEXT,
    type: 'text',
    timestamp: Date.now(),
    phoneNumberId: PHONE_NUM_ID,
  }
}
const extracted = await runNode('Extrair Mensagem', webhookBody)
if (!extracted || extracted.length === 0) {
  console.error('❌ Retornou vazio — checar validação de phone/messageId')
  process.exit(1)
}
const extractedJson = extracted[0].json
console.log('✅', JSON.stringify(extractedJson, null, 2))

// ── Step 2: Roteador de Conversa ──────────────────────────────────────────────
console.log('\n━━━ Roteador de Conversa ━━━')
const sessionRow = CURRENT_STATE === 'new'
  ? null
  : { current_state: CURRENT_STATE, context: JSON.stringify(SESSION_CTX) }

const buscarSessaoOutput = sessionRow ?? {}
const routerOutput = await runNode('Roteador de Conversa', {}, {
  'Extrair Mensagem': extractedJson,
  'Buscar Sessão':    buscarSessaoOutput,
})
if (!routerOutput || routerOutput.length === 0) {
  console.error('❌ Router retornou vazio')
  process.exit(1)
}
const routerJson = routerOutput[0].json
console.log('✅ newState:', routerJson.newState)
console.log('   triggerSimulation:', routerJson.triggerSimulation)
console.log('   response:', routerJson.response?.slice(0, 120))

// ── Step 3: Compor Mensagem ───────────────────────────────────────────────────
console.log('\n━━━ Compor Mensagem ━━━')
const composedOutput = await runNode('Compor Mensagem', {}, {
  'Roteador de Conversa': routerJson,
})
if (!composedOutput || composedOutput.length === 0) {
  console.error('❌ Compor Mensagem retornou vazio')
  process.exit(1)
}
const composedJson = composedOutput[0].json
console.log('✅ phone:', composedJson.phone)
console.log('   phoneNumberId:', composedJson.phoneNumberId)
console.log('   response:', composedJson.response?.slice(0, 120))

// ── Step 4: Enviar WhatsApp (HTTP Request node — mock via $helpers) ───────────
console.log('\n━━━ Enviar WhatsApp (HTTP Request node) ━━━')
console.log('  Simulando POST para Meta WhatsApp...')
const waRes = await $helpers.httpRequest({
  method: 'POST',
  url: `https://graph.facebook.com/${composedJson.waVersion}/${composedJson.phoneNumberId}/messages`,
  headers: { 'Authorization': `Bearer ${composedJson.waToken}` },
  body: {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: composedJson.phone,
    type: 'text',
    text: { body: composedJson.response },
  },
  json: true,
  returnFullResponse: true,
})
if (!waRes || waRes.statusCode >= 400) {
  console.error('❌ WhatsApp mock falhou:', waRes)
  process.exit(1)
}
console.log('✅ resposta mock:', JSON.stringify(waRes.body))
