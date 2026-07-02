import type { Role } from '@/infra/database/schema'

export type RolePermission = {
  resource: string
  action:   string
}

export type CreateRoleInput = {
  name:         string
  description?: string | null
  permissions:  RolePermission[]
}

export type UpdateRoleInput = Partial<CreateRoleInput>

export type RoleWithUsersCount = Role & { usersCount: number }

export interface RoleRepository {
  findAll(): Promise<RoleWithUsersCount[]>
  findById(id: string): Promise<Role | null>
  findByName(name: string): Promise<Role | null>
  create(input: CreateRoleInput): Promise<Role>
  update(id: string, input: UpdateRoleInput): Promise<Role>
  delete(id: string): Promise<void>
  countUsersByRoleId(roleId: string): Promise<number>
}
