import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { z } from 'zod'
import type { ListBanksUseCase } from '../../application/use-cases/ListBanksUseCase'
import type { GetBankRatesAdminUseCase } from '../../application/use-cases/GetBankRatesAdminUseCase'
import type { CreateBankRateUseCase } from '../../application/use-cases/CreateBankRateUseCase'

const rateSchema = z.object({
  modality: z.string(),
  rateAnnual: z.string(),
  minTermMonths: z.number().optional(),
  maxTermMonths: z.number().optional(),
  maxLtv: z.string().optional(),
  effectiveDate: z.string(),
  source: z.string().default('manual'),
})

export class BankController {
  constructor(
    private readonly listBanks: ListBanksUseCase,
    private readonly getBankRates: GetBankRatesAdminUseCase,
    private readonly createBankRate: CreateBankRateUseCase,
  ) {}

  async list(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const onlyActive = query.get('active') === 'true' || query.get('active') === '1'
    const result = await this.listBanks.execute(onlyActive || undefined)
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async getRates(res: HttpResponse, req: HttpRequest) {
    const bankId = req.getParameter(0)
    const query = new URLSearchParams(req.getQuery())
    const result = await this.getBankRates.execute(bankId, query.get('modality') ?? undefined)
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async createRate(res: HttpResponse, req: HttpRequest, body: unknown) {
    const bankId = req.getParameter(0)
    const input = rateSchema.parse(body)
    const rate = await this.createBankRate.execute({ ...input, bankId })
    res.writeStatus('201 Created').end(JSON.stringify(rate))
  }
}
