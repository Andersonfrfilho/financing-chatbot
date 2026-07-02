import { eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { roles, users } from '@/infra/database/schema'
import type { Role } from '@/infra/database/schema'
import type {
  RoleRepository,
  CreateRoleInput,
  UpdateRoleInput,
  RoleWithUsersCount,
} from '../../domain/repositories/RoleRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DrizzleRoleRepository implements RoleRepository {
  async findAll(): Promise<RoleWithUsersCount[]> {
    const result = await db
      .select({
        id:          roles.id,
        name:        roles.name,
        description: roles.description,
        permissions: roles.permissions,
        createdAt:   roles.createdAt,
        updatedAt:   roles.updatedAt,
        usersCount:  sql<number>`count(${users.id})`,
      })
      .from(roles)
      .leftJoin(users, eq(users.roleId, roles.id))
      .groupBy(roles.id)
      .orderBy(roles.name)

    return result.map((row) => ({ ...row, usersCount: Number(row.usersCount) }))
  }

  async findById(id: string): Promise<Role | null> {
    const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByName(name: string): Promise<Role | null> {
    const result = await db.select().from(roles).where(ilike(roles.name, name)).limit(1)
    return result[0] ?? null
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const result = await db.insert(roles).values(input).returning()
    return result[0]!
  }

  async update(id: string, input: UpdateRoleInput): Promise<Role> {
    const result = await db
      .update(roles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning()

    if (!result[0]) throw new NotFoundError('Perfil não encontrado')
    return result[0]
  }

  async delete(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id))
  }

  async countUsersByRoleId(roleId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.roleId, roleId))

    return Number(result[0]!.count)
  }
}
