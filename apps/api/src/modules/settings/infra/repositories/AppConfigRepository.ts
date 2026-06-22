import { eq } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import * as schema from '@/infra/database/schema'

export class AppConfigRepository {
  async getConfig(key: string): Promise<string | null> {
    const result = await db
      .select({ value: schema.appConfig.value })
      .from(schema.appConfig)
      .where(eq(schema.appConfig.key, key))
      .limit(1)
    return result[0]?.value ?? null
  }

  async getConfigAsNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.getConfig(key)
    return value ? parseInt(value, 10) : defaultValue
  }

  async setConfig(key: string, value: string): Promise<void> {
    await db
      .insert(schema.appConfig)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.appConfig.key, set: { value, updatedAt: new Date() } })
  }

  async getAllConfigs(): Promise<Record<string, string>> {
    const rows = await db.select({ key: schema.appConfig.key, value: schema.appConfig.value }).from(schema.appConfig)
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  }
}
