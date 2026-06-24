import type { ClientRepository, CreateClientInput } from '../../domain/repositories/ClientRepository'

export class CreateClientUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(input: CreateClientInput) {
    return this.clientRepository.upsert(input)
  }
}
