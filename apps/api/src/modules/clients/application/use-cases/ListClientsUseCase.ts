import type { ClientRepository, ClientFilters } from '../../domain/repositories/ClientRepository'

export class ListClientsUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(filters: ClientFilters) {
    return this.clientRepository.findAll(filters)
  }
}
