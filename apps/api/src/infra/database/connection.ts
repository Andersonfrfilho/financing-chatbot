import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import fs from 'fs'
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
  const migrationsFolder = './drizzle/migrations'
  const hasMigrations = fs.existsSync(migrationsFolder) && fs.readdirSync(migrationsFolder).some((f) => f.endsWith('.sql'))
  if (!hasMigrations) {
    console.log('[DB] No migration files found — skipping migrate step')
    return
  }
  await migrate(db, { migrationsFolder })
  console.log('[DB] Migrations applied')
}
