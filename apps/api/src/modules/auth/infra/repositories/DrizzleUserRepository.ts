import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { UserRepository } from '../../domain/repositories/UserRepository'
import type { UserEntity, UserRole } from '../../domain/entities/User'
import * as schema from '@/infra/database/schema'

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findByEmail(email: string): Promise<(UserEntity & { role: UserRole }) | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
      with: { role: true },
    })
    return row ? this.mapRow(row) : null
  }

  async findById(id: string): Promise<(UserEntity & { role: UserRole }) | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: { role: true },
    })
    return row ? this.mapRow(row) : null
  }

  private mapRow(row: schema.User & { role: schema.Role }): UserEntity & { role: UserRole } {
    return {
      id: row.id,
      roleId: row.roleId,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      active: row.active,
      passwordMustChange: row.passwordMustChange,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: {
        id: row.role.id,
        name: row.role.name,
        permissions: (row.role.permissions as Array<{ resource: string; action: string }>) ?? [],
      },
    }
  }
}
