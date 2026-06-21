import type { ClientRepository } from '../../domain/repositories/ClientRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class GetClientUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(id: string) {
    const client = await this.clientRepository.findById(id)
    if (!client) throw new NotFoundError('Cliente não encontrado')
    return client
  }
}
