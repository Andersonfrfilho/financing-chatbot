import type { DrizzleSessionRepository, SessionFilters } from '../../infra/repositories/DrizzleSessionRepository'

export class ListSessionsUseCase {
  constructor(private readonly sessionRepository: DrizzleSessionRepository) {}

  async execute(filters: SessionFilters) {
    return this.sessionRepository.findAll(filters)
  }
}
