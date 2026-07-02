import type { RoleRepository } from '../../domain/repositories/RoleRepository'
import { ConflictError, NotFoundError } from '@/shared/errors/AppError'

const ADMIN_ROLE_NAME = 'admin'

export class DeleteRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id)
    if (!role) throw new NotFoundError('Perfil não encontrado')

    if (role.name === ADMIN_ROLE_NAME) throw new ConflictError('Não é possível excluir o perfil admin')

    const usersCount = await this.roleRepository.countUsersByRoleId(id)
    if (usersCount > 0) throw new ConflictError('Não é possível excluir um perfil vinculado a usuários')

    await this.roleRepository.delete(id)
  }
}
