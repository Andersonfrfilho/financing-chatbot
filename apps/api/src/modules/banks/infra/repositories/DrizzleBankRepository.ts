import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { banks, bankRates } from '@/infra/database/schema'
import type { Bank, BankRate } from '@/infra/database/schema'
import { NotFoundError } from '@/shared/errors/AppError'

export type CreateBankInput = {
  name: string
  code: string
  openFinanceBaseUrl?: string
  active?: boolean
}

export type CreateBankRateInput = {
  bankId: string
  modality: string
  rateAnnual: string
  minTermMonths?: number
  maxTermMonths?: number
  maxLtv?: string
  effectiveDate: string
  source: string
}

export class DrizzleBankRepository {
  async findAll(onlyActive?: boolean): Promise<Bank[]> {
    const where = onlyActive ? eq(banks.active, true) : undefined
    return db.select().from(banks).where(where).orderBy(banks.name)
  }

  async findById(id: string): Promise<Bank | null> {
    const result = await db.select().from(banks).where(eq(banks.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByCode(code: string): Promise<Bank | null> {
    const result = await db.select().from(banks).where(eq(banks.code, code)).limit(1)
    return result[0] ?? null
  }

  async create(input: CreateBankInput): Promise<Bank> {
    const result = await db.insert(banks).values(input).returning()
    return result[0]
  }

  async update(id: string, input: Partial<CreateBankInput>): Promise<Bank> {
    const result = await db.update(banks).set(input).where(eq(banks.id, id)).returning()
    if (!result[0]) throw new NotFoundError('Banco não encontrado')
    return result[0]
  }

  async getRates(bankId: string, modality?: string): Promise<BankRate[]> {
    const conditions = [eq(bankRates.bankId, bankId)]
    if (modality) conditions.push(eq(bankRates.modality, modality as any))
    return db.select().from(bankRates).where(and(...conditions)).orderBy(desc(bankRates.effectiveDate))
  }

  async upsertRate(input: CreateBankRateInput): Promise<BankRate> {
    const result = await db
      .insert(bankRates)
      .values({
        bankId:        input.bankId,
        modality:      input.modality      as BankRate['modality'],
        rateAnnual:    input.rateAnnual,
        minTermMonths: input.minTermMonths ?? 1,
        maxTermMonths: input.maxTermMonths ?? 480,
        maxLtv:        input.maxLtv        ?? '1.0000',
        effectiveDate: input.effectiveDate,
        source:        (input.source ?? 'manual') as BankRate['source'],
      })
      .returning()
    return result[0]
  }
}
