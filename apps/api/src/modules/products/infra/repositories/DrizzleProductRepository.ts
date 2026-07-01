import { eq, ilike, and, isNull, sql, desc } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { products } from '@/infra/database/schema'
import type { Product } from '@/infra/database/schema'
import type {
  ProductRepository,
  CreateProductInput,
  UpdateProductInput,
  ProductSyncResult,
  ProductFilters,
} from '../../domain/repositories/ProductRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleProductRepository implements ProductRepository {
  async findById(id: string): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1)
    return result[0] ?? null
  }

  async findAll(filters: ProductFilters): Promise<{ data: Product[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [isNull(products.deletedAt)]
    if (filters.search) conditions.push(ilike(products.name, `%${filters.search}%`))
    if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId))
    if (filters.active !== undefined) conditions.push(eq(products.active, filters.active))

    const where = and(...conditions)

    const [data, countResult] = await Promise.all([
      db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(where),
    ])

    return { data, total: Number(countResult[0].count) }
  }

  async create(input: CreateProductInput): Promise<Product> {
    const result = await db.insert(products).values(input).returning()
    return result[0]
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const result = await db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning()
    if (!result[0]) throw new NotFoundError('Produto não encontrado')
    return result[0]
  }

  async updateSyncResult(id: string, result: ProductSyncResult): Promise<Product> {
    const updated = await db
      .update(products)
      .set({
        syncStatus: result.syncStatus,
        externalId: result.externalId,
        syncError:  result.syncError ?? null,
        updatedAt:  new Date(),
      })
      .where(eq(products.id, id))
      .returning()
    if (!updated[0]) throw new NotFoundError('Produto não encontrado')
    return updated[0]
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id))
  }
}
