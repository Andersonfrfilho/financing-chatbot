import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import fs from 'fs'
import * as schema from './schema'

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, { schema })

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect()
  client.release()
  console.log('[DB] Connected to PostgreSQL')
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
