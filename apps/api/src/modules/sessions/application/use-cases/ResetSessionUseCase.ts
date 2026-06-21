import type { DrizzleSessionRepository } from '../../infra/repositories/DrizzleSessionRepository'

export class ResetSessionUseCase {
  constructor(private readonly sessionRepository: DrizzleSessionRepository) {}

  async execute(whatsappNumber: string) {
    await this.sessionRepository.delete(whatsappNumber)
  }
}
