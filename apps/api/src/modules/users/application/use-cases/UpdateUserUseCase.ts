import { hash } from '@node-rs/argon2'
import type { UserManagementRepository, UpdateUserInput } from '../../domain/repositories/UserManagementRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserManagementRepository) {}

  async execute(id: string, input: UpdateUserInput & { password?: string }) {
    const existing = await this.userRepository.findById(id)
    if (!existing) throw new NotFoundError('Usuário não encontrado')

    const { password, ...rest } = input
    const updateData: UpdateUserInput = { ...rest }
    if (password) updateData.passwordHash = await hash(password)

    return this.userRepository.update(id, updateData)
  }
}
