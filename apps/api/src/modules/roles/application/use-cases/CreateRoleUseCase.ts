import type { Role } from '@/infra/database/schema'
import type { RoleRepository, CreateRoleInput } from '../../domain/repositories/RoleRepository'
import { ConflictError } from '@/shared/errors/AppError'

export class CreateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    const existing = await this.roleRepository.findByName(input.name)
    if (existing) throw new ConflictError('Já existe um perfil com este nome')

    return this.roleRepository.create(input)
  }
}
