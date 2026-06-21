import type { ClientRepository, UpdateClientInput } from '../../domain/repositories/ClientRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class UpdateClientUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(id: string, input: UpdateClientInput) {
    const existing = await this.clientRepository.findById(id)
    if (!existing) throw new NotFoundError('Cliente não encontrado')
    return this.clientRepository.update(id, input)
  }
}
