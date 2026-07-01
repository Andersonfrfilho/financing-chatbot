import { eq, ilike, and, isNull, sql, desc } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { categories, products } from '@/infra/database/schema'
import type { Category } from '@/infra/database/schema'
import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategorySyncResult,
  CategoryFilters,
} from '../../domain/repositories/CategoryRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleCategoryRepository implements CategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const result = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1)
    return result[0] ?? null
  }

  async findAll(filters: CategoryFilters): Promise<{ data: Category[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [isNull(categories.deletedAt)]
    if (filters.search) conditions.push(ilike(categories.name, `%${filters.search}%`))
    if (filters.active !== undefined) conditions.push(eq(categories.active, filters.active))

    const where = and(...conditions)

    const [data, countResult] = await Promise.all([
      db.select().from(categories).where(where).orderBy(desc(categories.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(categories).where(where),
    ])

    return { data, total: Number(countResult[0].count) }
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const result = await db.insert(categories).values(input).returning()
    return result[0]
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const result = await db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .returning()
    if (!result[0]) throw new NotFoundError('Categoria não encontrada')
    return result[0]
  }

  async updateSyncResult(id: string, result: CategorySyncResult): Promise<Category> {
    const updated = await db
      .update(categories)
      .set({
        syncStatus: result.syncStatus,
        externalId: result.externalId,
        syncError:  result.syncError ?? null,
        updatedAt:  new Date(),
      })
      .where(eq(categories.id, id))
      .returning()
    if (!updated[0]) throw new NotFoundError('Categoria não encontrada')
    return updated[0]
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id))
  }

  async countActiveProducts(categoryId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt), eq(products.active, true)))
    return Number(result[0].count)
  }
}
