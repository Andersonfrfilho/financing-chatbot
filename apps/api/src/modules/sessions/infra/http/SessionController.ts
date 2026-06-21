import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import type { ListSessionsUseCase } from '../../application/use-cases/ListSessionsUseCase'
import type { ResetSessionUseCase } from '../../application/use-cases/ResetSessionUseCase'
import type { DrizzleSessionRepository } from '../repositories/DrizzleSessionRepository'

export class SessionController {
  constructor(
    private readonly listSessions: ListSessionsUseCase,
    private readonly resetSession: ResetSessionUseCase,
    private readonly sessionRepository: DrizzleSessionRepository,
  ) {}

  async list(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const result = await this.listSessions.execute({
      state: query.get('state') ?? undefined,
      startDate: query.get('startDate') ?? undefined,
      endDate: query.get('endDate') ?? undefined,
      page: query.get('page') ? Number(query.get('page')) : undefined,
      limit: query.get('limit') ? Number(query.get('limit')) : undefined,
    })
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async countByState(res: HttpResponse) {
    const counts = await this.sessionRepository.countByState()
    res.writeStatus('200 OK').end(JSON.stringify(counts))
  }

  async reset(res: HttpResponse, req: HttpRequest) {
    const whatsappNumber = req.getParameter(0)
    await this.resetSession.execute(whatsappNumber)
    res.writeStatus('204 No Content').end()
  }
}
