import { eq, ilike, and, sql, desc } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { users, roles } from '@/infra/database/schema'
import type { User } from '@/infra/database/schema'
import type { UserManagementRepository, CreateUserInput, UpdateUserInput, UserWithRole } from '../../domain/repositories/UserManagementRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleUserManagementRepository implements UserManagementRepository {
  async findById(id: string): Promise<UserWithRole | null> {
    const result = await db
      .select()
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1)
    if (!result[0]) return null
    return { ...result[0].users, role: result[0].roles }
  }

  async findByEmail(email: string): Promise<UserWithRole | null> {
    const result = await db
      .select()
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1)
    if (!result[0]) return null
    return { ...result[0].users, role: result[0].roles }
  }

  async findAll(filters: { search?: string; roleId?: string; active?: boolean; page?: number; limit?: number }): Promise<{ data: UserWithRole[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    if (filters.search) conditions.push(ilike(users.name, `%${filters.search}%`))
    if (filters.roleId) conditions.push(eq(users.roleId, filters.roleId))
    if (filters.active !== undefined) conditions.push(eq(users.active, filters.active))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, countResult] = await Promise.all([
      db.select().from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(users).where(where),
    ])

    return {
      data: data.map((r) => ({ ...r.users, role: r.roles })),
      total: Number(countResult[0].count),
    }
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await db.insert(users).values(input).returning()
    return result[0]
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    if (!result[0]) throw new NotFoundError('Usuário não encontrado')
    return result[0]
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  }
}
