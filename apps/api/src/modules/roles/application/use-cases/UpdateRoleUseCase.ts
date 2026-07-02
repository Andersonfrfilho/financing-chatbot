import type { Role } from '@/infra/database/schema'
import type { RoleRepository, UpdateRoleInput } from '../../domain/repositories/RoleRepository'
import { ConflictError, NotFoundError } from '@/shared/errors/AppError'

const ADMIN_ROLE_NAME = 'admin'
const FULL_ACCESS_RESOURCE = '*'
const FULL_ACCESS_ACTION = '*'

export class UpdateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: string, input: UpdateRoleInput): Promise<Role> {
    const role = await this.roleRepository.findById(id)
    if (!role) throw new NotFoundError('Perfil não encontrado')

    if (input.name && input.name.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await this.roleRepository.findByName(input.name)
      if (existing) throw new ConflictError('Já existe um perfil com este nome')
    }

    if (role.name === ADMIN_ROLE_NAME && input.permissions) {
      const keepsFullAccess = input.permissions.some(
        (permission) => permission.resource === FULL_ACCESS_RESOURCE && permission.action === FULL_ACCESS_ACTION,
      )
      if (!keepsFullAccess) throw new ConflictError('Não é possível remover o acesso total do perfil admin')
    }

    return this.roleRepository.update(id, input)
  }
}
