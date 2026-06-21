import { hash } from '@node-rs/argon2'
import type { UserManagementRepository } from '../../domain/repositories/UserManagementRepository'
import { ConflictError } from '@/shared/errors/AppError'

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserManagementRepository) {}

  async execute(input: { name: string; email: string; password: string; roleId: string }) {
    const existing = await this.userRepository.findByEmail(input.email)
    if (existing) throw new ConflictError('E-mail já cadastrado')
    const passwordHash = await hash(input.password)
    return this.userRepository.create({ name: input.name, email: input.email, passwordHash, roleId: input.roleId })
  }
}
