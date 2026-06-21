import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { GetDashboardStatsUseCase } from '../../application/use-cases/GetDashboardStatsUseCase'
import type { GetCommercialReportUseCase } from '../../application/use-cases/GetCommercialReportUseCase'

export class DashboardController {
  constructor(
    private readonly getDashboardStats:    GetDashboardStatsUseCase,
    private readonly getCommercialReport:  GetCommercialReportUseCase,
  ) {}

  async stats(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const data = await this.getDashboardStats.execute()
    response.json(data)
  }

  async commercial(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const startDate = q['startDate'] ? new Date(q['startDate']) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate   = q['endDate']   ? new Date(q['endDate'])   : new Date()
    const data = await this.getCommercialReport.execute(startDate, endDate)
    response.json(data)
  }
}
