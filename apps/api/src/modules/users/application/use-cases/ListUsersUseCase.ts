import type { UserManagementRepository } from '../../domain/repositories/UserManagementRepository'

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserManagementRepository) {}

  async execute(filters: { search?: string; roleId?: string; active?: boolean; page?: number; limit?: number }) {
    return this.userRepository.findAll(filters)
  }
}
