const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
type Level = keyof typeof LEVELS

const current: number = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info

function log(level: Level, msg: string, data?: unknown): void {
  if (LEVELS[level] < current) return
  const entry = JSON.stringify({
    level,
    msg,
    ...(data !== undefined && { data }),
    ts: new Date().toISOString(),
  })
  if (level === 'error') {
    console.error(entry)
  } else {
    console.log(entry)
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info:  (msg: string, data?: unknown) => log('info',  msg, data),
  warn:  (msg: string, data?: unknown) => log('warn',  msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
}
