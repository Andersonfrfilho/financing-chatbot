import type { ClientRepository } from '../../domain/repositories/ClientRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DeleteClientUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(id: string) {
    const existing = await this.clientRepository.findById(id)
    if (!existing) throw new NotFoundError('Cliente não encontrado')
    await this.clientRepository.softDelete(id)
  }
}
