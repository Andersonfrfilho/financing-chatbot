import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { logger } from '@/shared/logger'
import * as schema from './schema'

const isProduction = process.env.NODE_ENV === 'production'
const dbLog = logger.child('DB')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  min: 2,                    // sempre manter 2 conexões abertas — evita reconexão do zero
  max: 10,
  idleTimeoutMillis: 60000,  // fechar conexão ociosa após 60s (default era 10s)
  connectionTimeoutMillis: 5000,
  keepAlive: true,
})

pool.on('connect', () => dbLog.debug('pool_connect', { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }))
pool.on('acquire', () => dbLog.debug('pool_acquire', { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }))
pool.on('remove', () => dbLog.debug('pool_remove', { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }))
pool.on('error', (err) => dbLog.error('pool_error', { error: String(err) }))

export const db = drizzle(pool, { schema })

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect()
  client.release()
  console.log('[DB] Connected to PostgreSQL')
}

export async function ensureN8nDatabase(): Promise<void> {
  // CREATE DATABASE cannot run inside a transaction — use a direct client
  const client = await pool.connect()
  try {
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'n8n'`)
    if (result.rowCount === 0) {
      await client.query('CREATE DATABASE n8n')
      console.log('[DB] Database "n8n" created')
    }
  } finally {
    client.release()
  }
}

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve('./drizzle/migrations')

  let files: string[]
  try {
    files = fs.readdirSync(migrationsFolder)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    console.log('[DB] No migrations folder found — skipping')
    return
  }

  if (files.length === 0) {
    console.log('[DB] No migration files found — skipping')
    return
  }

  console.log(`[DB] Running ${files.length} migrations...`)

  const client = await pool.connect()
  try {
    for (const file of files) {
      const filePath = path.join(migrationsFolder, file)
      const sql = fs.readFileSync(filePath, 'utf-8')
      try {
        await client.query(sql)
        console.log(`[DB]   OK  ${file}`)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('already exists') || message.includes('multiple primary keys')) {
          console.log(`[DB]   SKIP  ${file} (já aplicada)`)
        } else {
          console.error(`[DB]   FAIL  ${file}: ${message}`)
        }
      }
    }
  } finally {
    client.release()
  }

  console.log('[DB] Migrations completed')
}
