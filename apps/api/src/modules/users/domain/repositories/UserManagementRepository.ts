import type { User, Role } from '@/infra/database/schema'

export type CreateUserInput = {
  name: string
  email: string
  passwordHash: string
  roleId: string
}

export type UpdateUserInput = {
  name?: string
  email?: string
  passwordHash?: string
  roleId?: string
  active?: boolean
  passwordMustChange?: boolean
}

export type UserWithRole = User & { role: Role }

export interface UserManagementRepository {
  findById(id: string): Promise<UserWithRole | null>
  findByEmail(email: string): Promise<UserWithRole | null>
  findAll(filters: { search?: string; roleId?: string; active?: boolean; page?: number; limit?: number }): Promise<{ data: UserWithRole[]; total: number }>
  create(input: CreateUserInput): Promise<User>
  update(id: string, input: UpdateUserInput): Promise<User>
  delete(id: string): Promise<void>
  findAllRoles(): Promise<Role[]>
}
