import type { LeadRepository, LeadFilters } from '../../domain/repositories/LeadRepository'

export class ListLeadsUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(filters: LeadFilters) {
    return this.leadRepository.findAll(filters)
  }
}
