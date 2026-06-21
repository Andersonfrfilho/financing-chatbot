import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import type { GetDashboardStatsUseCase } from '../../application/use-cases/GetDashboardStatsUseCase'
import type { GetCommercialReportUseCase } from '../../application/use-cases/GetCommercialReportUseCase'

export class DashboardController {
  constructor(
    private readonly getDashboardStats: GetDashboardStatsUseCase,
    private readonly getCommercialReport: GetCommercialReportUseCase,
  ) {}

  async stats(res: HttpResponse) {
    const data = await this.getDashboardStats.execute()
    res.writeStatus('200 OK').end(JSON.stringify(data))
  }

  async commercial(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const startDate = query.get('startDate') ? new Date(query.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = query.get('endDate') ? new Date(query.get('endDate')!) : new Date()
    const data = await this.getCommercialReport.execute(startDate, endDate)
    res.writeStatus('200 OK').end(JSON.stringify(data))
  }
}
