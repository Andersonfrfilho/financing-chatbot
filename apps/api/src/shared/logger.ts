import { readFileSync } from 'fs'
import { join } from 'path'
import { getReqId } from './request-context'

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
type Level = keyof typeof LEVELS

const CURRENT_LEVEL: number = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info
const USE_COLOR = process.env.NO_COLOR === undefined && process.stdout.isTTY !== false

// ANSI color codes
const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
} as const

const LEVEL_COLOR: Record<Level, string> = {
  debug: C.cyan,
  info:  C.green,
  warn:  C.yellow,
  error: C.red,
}

const LEVEL_LABEL: Record<Level, string> = {
  debug: 'DBG',
  info:  'INF',
  warn:  'WRN',
  error: 'ERR',
}

const APP_NAME = 'financing-api'
let APP_VERSION = '0.0.0'
try {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
  APP_VERSION = (JSON.parse(raw) as { version?: string }).version ?? '0.0.0'
} catch { /* package.json not present at runtime */ }

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'x-api-key'])

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [
      k,
      SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v,
    ]),
  )
}

function color(code: string, text: string): string {
  return USE_COLOR ? `${code}${text}${C.reset}` : text
}

export class Logger {
  constructor(private readonly contexts: string[] = []) {}

  child(...contexts: string[]): Logger {
    return new Logger([...this.contexts, ...contexts])
  }

  private format(level: Level, msg: string, data?: unknown): string {
    const ts      = color(C.dim,   `[${new Date().toISOString()}]`)
    const reqId   = getReqId()
    const req     = reqId ? color(C.blue,    `[${reqId}]`) : ''
    const app     = color(C.magenta, `[${APP_NAME}:${APP_VERSION}]`)
    const ctx     = this.contexts.map(c => color(C.cyan, `[${c}]`)).join('')
    const lvlClr  = LEVEL_COLOR[level]
    const lvl     = color(`${C.bold}${lvlClr}`, `[${LEVEL_LABEL[level]}]`)
    const message = color(lvlClr, msg)
    const tail    = data !== undefined
      ? ` - ${color(C.dim, JSON.stringify(data))}`
      : ''

    return `${ts}${req}${app}${ctx}${lvl} - ${message}${tail}`
  }

  private log(level: Level, msg: string, data?: unknown): void {
    if (LEVELS[level] < CURRENT_LEVEL) return
    const line = this.format(level, msg, data)
    if (level === 'error') console.error(line)
    else console.log(line)
  }

  debug(msg: string, data?: unknown): void { this.log('debug', msg, data) }
  info (msg: string, data?: unknown): void { this.log('info',  msg, data) }
  warn (msg: string, data?: unknown): void { this.log('warn',  msg, data) }
  error(msg: string, data?: unknown): void { this.log('error', msg, data) }
}

export const logger = new Logger()
