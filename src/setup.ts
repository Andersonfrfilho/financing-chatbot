// Extração de contexto e helpers do n8n para o bot de financiamento

const entry = $input.first().json?.body?.entry?.[0]
const change = entry?.changes?.[0]?.value
const message = change?.messages?.[0]

const phone = message?.from ?? ''
const messageType = message?.type ?? 'text'

let incomingText = ''
if (messageType === 'text') {
  incomingText = message?.text?.body?.trim() ?? ''
} else if (messageType === 'interactive') {
  incomingText = message?.interactive?.button_reply?.id ?? message?.interactive?.list_reply?.id ?? ''
}

const isGreeting = /^(oi|olá|ola|hello|hi|bom dia|boa tarde|boa noite|início|inicio|start|menu)$/i.test(incomingText)
const isCancel = /^(cancelar|cancel|sair|exit|parar|stop|voltar)$/i.test(incomingText)
const isRestart = /^(reiniciar|restart|recomeçar|novo|nova simulação)$/i.test(incomingText)

// Sessão do cliente (vem do PostgreSQL via n8n lookup)
const session = $input.first().json?.session ?? { currentState: 'greeting', context: {} }
const currentState = session.currentState ?? 'greeting'
const context = session.context ?? {}

// Helpers de validação
function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]!) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  if (check !== parseInt(digits[9]!)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]!) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  return check === parseInt(digits[10]!)
}

function isValidDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false
  const [, day, month, year] = match.map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day
}

function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[R$\s.]/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) || value <= 0 ? null : value
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FINANCING_TYPE_MAP: Record<string, string> = {
  '1': 'imobiliario', 'imobiliario': 'imobiliario',
  '2': 'veiculo', 'veiculo': 'veiculo',
  '3': 'pessoal', 'pessoal': 'pessoal',
  '4': 'consignado', 'consignado': 'consignado',
  '5': 'empresa', 'empresa': 'empresa',
  '6': 'equipamento', 'equipamento': 'equipamento',
  '7': 'rural', 'rural': 'rural',
}

const CIVIL_STATUS_MAP: Record<string, string> = {
  '1': 'single', '2': 'married', '3': 'divorced', '4': 'widowed', '5': 'stable_union',
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  '1': 'residential', '2': 'commercial', '3': 'land', '4': 'rural',
}

const VEHICLE_TYPE_MAP: Record<string, string> = {
  '1': 'car', '2': 'motorcycle', '3': 'truck', '4': 'other',
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  '1': 'clt', '2': 'servidor_publico', '3': 'aposentado_inss', '4': 'autonomo', '5': 'empresario',
}

const TERM_SHORTCUTS: Record<string, number> = {
  '1': 12, '2': 24, '3': 36, '4': 48, '5': 60,
}

const VALID_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

return {
  phone, messageType, incomingText, isGreeting, isCancel, isRestart,
  currentState, context, session,
  isValidCPF, isValidDate, parseAmount, formatCurrency,
  FINANCING_TYPE_MAP, CIVIL_STATUS_MAP, PROPERTY_TYPE_MAP,
  VEHICLE_TYPE_MAP, EMPLOYMENT_TYPE_MAP, TERM_SHORTCUTS, VALID_STATES,
}
