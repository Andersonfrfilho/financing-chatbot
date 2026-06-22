import { ValidationError } from '@/shared/errors/AppError'
import type { AppConfigRepository } from '../../infra/repositories/AppConfigRepository'

export class UpdateMaxAgentSessionsUseCase {
  constructor(private readonly configRepo: AppConfigRepository) {}

  async execute(maxSessions: number): Promise<{ maxSessions: number }> {
    if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 100) {
      throw new ValidationError('Limite deve ser um número entre 1 e 100')
    }

    await this.configRepo.setConfig('max_agent_sessions', String(maxSessions))
    return { maxSessions }
  }

  async getMaxSessions(): Promise<number> {
    return this.configRepo.getConfigAsNumber('max_agent_sessions', 10)
  }
}
