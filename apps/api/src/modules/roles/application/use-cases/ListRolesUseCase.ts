import type { RoleRepository, RoleWithUsersCount } from '../../domain/repositories/RoleRepository'

export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<RoleWithUsersCount[]> {
    return this.roleRepository.findAll()
  }
}
