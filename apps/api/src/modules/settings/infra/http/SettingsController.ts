import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'
import type { UpdateMaxAgentSessionsUseCase } from '../../application/use-cases/UpdateMaxAgentSessionsUseCase'

const updateMaxSessionsSchema = z.object({
  maxSessions: z.number().int().min(1).max(100),
})

export class SettingsController {
  constructor(private readonly updateMaxAgentSessionsUseCase: UpdateMaxAgentSessionsUseCase) {}

  async getMaxAgentSessions(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const maxSessions = await this.updateMaxAgentSessionsUseCase.getMaxSessions()
    res.json({ maxSessions }, 200)
  }

  async updateMaxAgentSessions(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(updateMaxSessionsSchema, req.body)
    const result = await this.updateMaxAgentSessionsUseCase.execute(input.maxSessions)
    res.json(result, 200)
  }
}
