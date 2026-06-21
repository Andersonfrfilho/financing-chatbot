#!/usr/bin/env node
// Concatena os handlers TypeScript e injeta no workflow n8n

const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, '..', 'src')
const WORKFLOW_PATH = path.join(__dirname, '..', 'n8n', 'workflows', '01-bot-financiamento.json')

function readFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
}

const HANDLER_ORDER = [
  'setup.ts',
  'handlers/GlobalHandler.ts',
  'handlers/GreetingHandler.ts',
  'handlers/FinancingTypeHandler.ts',
  'handlers/PersonalDataHandler.ts',
  'handlers/FinancialDataHandler.ts',
  'handlers/ImmovableHandler.ts',
  'handlers/VehicleHandler.ts',
  'handlers/LoanHandler.ts',
  'handlers/TermAndSimulationHandler.ts',
  'handlers/SimulationResultHandler.ts',
  'router.ts',
  'teardown.ts',
]

function stripImports(code) {
  return code.replace(/^import\s+.*from\s+['"].*['"]\s*;?\s*\n/gm, '')
}

// Carrega constantes embutidas
const messagesPath = path.join(SRC_DIR, 'shared', 'constants', 'MessagesConstants.ts')
const messagesCode = fs.existsSync(messagesPath)
  ? 'const MessagesConstants = ' + JSON.stringify(buildMessages(), null, 2) + ';\n\n'
  : ''

function buildMessages() {
  // Versão simplificada para injeção no n8n (sem exports)
  const raw = readFile(messagesPath)
  // Extrai o objeto exportado
  const match = raw.match(/export const MessagesConstants = ({[\s\S]*?})/)
  return match ? '/* see MessagesConstants.ts */' : {}
}

const parts = [
  '// AUTO-GERADO por scripts/build-workflow.js — não editar diretamente\n',
  '// Handlers do bot de financiamento\n\n',
]

for (const file of HANDLER_ORDER) {
  const filePath = path.join(SRC_DIR, file)
  if (!fs.existsSync(filePath)) {
    console.warn(`[build] Arquivo não encontrado: ${file}`)
    continue
  }
  const content = readFile(filePath)
  parts.push(`// ─── ${file} ───\n`)
  parts.push(stripImports(content))
  parts.push('\n\n')
}

const combinedCode = parts.join('')

// Carrega ou cria o workflow base
let workflow = {}
if (fs.existsSync(WORKFLOW_PATH)) {
  workflow = JSON.parse(readFile(WORKFLOW_PATH))
} else {
  workflow = buildBaseWorkflow()
}

// Injeta o código no nó "Rotear e Responder"
if (workflow.nodes) {
  const routerNode = workflow.nodes.find((n) => n.name === 'Rotear e Responder')
  if (routerNode) {
    routerNode.parameters = routerNode.parameters || {}
    routerNode.parameters.jsCode = combinedCode
    console.log('[build] Código injetado no nó "Rotear e Responder"')
  } else {
    console.warn('[build] Nó "Rotear e Responder" não encontrado no workflow')
  }
}

fs.writeFileSync(WORKFLOW_PATH, JSON.stringify(workflow, null, 2))
console.log('[build] Workflow gerado em:', WORKFLOW_PATH)

function buildBaseWorkflow() {
  return {
    name: 'Bot Financiamento WhatsApp',
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'Webhook Meta',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          path: 'whatsapp-financiamento',
          httpMethod: 'POST',
        },
        position: [100, 300],
      },
      {
        id: 'verify-webhook',
        name: 'Verificar Webhook Meta',
        type: 'n8n-nodes-base.code',
        parameters: {
          jsCode: `
// Verifica o challenge da Meta (GET) vs mensagem real (POST)
const method = $input.first().json?.method ?? 'POST'
if (method === 'GET') {
  const challenge = $input.first().json?.query?.['hub.challenge']
  return [{ json: { challenge, type: 'verification' } }]
}
return [{ json: { ...$input.first().json, type: 'message' } }]
          `,
        },
        position: [300, 300],
      },
      {
        id: 'buscar-sessao',
        name: 'Buscar Sessão',
        type: 'n8n-nodes-base.postgres',
        parameters: {
          operation: 'select',
          table: 'conversation_sessions',
          where: 'whatsapp_number = \'{{ $json.phone }}\'',
          limit: 1,
        },
        position: [500, 300],
      },
      {
        id: 'rotear-responder',
        name: 'Rotear e Responder',
        type: 'n8n-nodes-base.code',
        parameters: {
          jsCode: combinedCode,
        },
        position: [700, 300],
      },
      {
        id: 'salvar-sessao',
        name: 'Salvar Sessão',
        type: 'n8n-nodes-base.postgres',
        parameters: {
          operation: 'upsert',
          table: 'conversation_sessions',
          conflictTarget: 'whatsapp_number',
        },
        position: [900, 300],
      },
      {
        id: 'chamar-api-simulacao',
        name: 'Chamar API Simulação',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: '={{ $env.API_BASE_URL }}/api/simulations',
          method: 'POST',
          sendBody: true,
          bodyContentType: 'json',
        },
        position: [900, 500],
      },
      {
        id: 'enviar-whatsapp',
        name: 'Enviar WhatsApp',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: '=https://graph.facebook.com/{{ $env.WHATSAPP_API_VERSION }}/{{ $env.WHATSAPP_PHONE_NUMBER_ID }}/messages',
          method: 'POST',
          authentication: 'genericCredentialType',
          sendBody: true,
          bodyContentType: 'json',
        },
        position: [1100, 300],
      },
    ],
    connections: {
      'Webhook Meta': { main: [[{ node: 'Verificar Webhook Meta', type: 'main', index: 0 }]] },
      'Verificar Webhook Meta': { main: [[{ node: 'Buscar Sessão', type: 'main', index: 0 }]] },
      'Buscar Sessão': { main: [[{ node: 'Rotear e Responder', type: 'main', index: 0 }]] },
      'Rotear e Responder': { main: [[{ node: 'Salvar Sessão', type: 'main', index: 0 }]] },
      'Salvar Sessão': { main: [[{ node: 'Enviar WhatsApp', type: 'main', index: 0 }]] },
    },
    active: false,
    settings: { timezone: 'America/Sao_Paulo' },
  }
}
