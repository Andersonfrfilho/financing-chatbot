import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListSessionsUseCase } from '../../application/use-cases/ListSessionsUseCase'
import type { ResetSessionUseCase } from '../../application/use-cases/ResetSessionUseCase'
import type { DrizzleSessionRepository } from '../repositories/DrizzleSessionRepository'

export class SessionController {
  constructor(
    private readonly listSessions:      ListSessionsUseCase,
    private readonly resetSession:      ResetSessionUseCase,
    private readonly sessionRepository: DrizzleSessionRepository,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const rawStates = q['states']
    const states = rawStates ? rawStates.split(',').filter(Boolean) : undefined
    const result = await this.listSessions.execute({
      search:    q['search'],
      states,
      startDate: q['startDate'],
      endDate:   q['endDate'],
      page:      q['page']  ? Number(q['page'])  : undefined,
      limit:     q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async countByState(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const counts = await this.sessionRepository.countByState()
    response.json(counts)
  }

  async reset(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.resetSession.execute(request.params['whatsappNumber'] ?? '')
    response.json(null, 204)
  }
}
