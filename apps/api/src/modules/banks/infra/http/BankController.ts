import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListBanksUseCase } from '../../application/use-cases/ListBanksUseCase'
import type { GetBankRatesAdminUseCase } from '../../application/use-cases/GetBankRatesAdminUseCase'
import type { CreateBankRateUseCase } from '../../application/use-cases/CreateBankRateUseCase'

const rateSchema = z.object({
  modality:      z.string(),
  rateAnnual:    z.string(),
  minTermMonths: z.number().optional(),
  maxTermMonths: z.number().optional(),
  maxLtv:        z.string().optional(),
  effectiveDate: z.string(),
  source:        z.string().default('manual'),
})

export class BankController {
  constructor(
    private readonly listBanks:     ListBanksUseCase,
    private readonly getBankRates:  GetBankRatesAdminUseCase,
    private readonly createBankRate: CreateBankRateUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const onlyActive = request.query['active'] === 'true' || request.query['active'] === '1'
    const result = await this.listBanks.execute(onlyActive || undefined)
    response.json(result)
  }

  async getRates(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const bankId = request.params['id'] ?? ''
    const result = await this.getBankRates.execute(bankId, request.query['modality'])
    response.json(result)
  }

  async createRate(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const bankId = request.params['id'] ?? ''
    const input  = rateSchema.parse(request.body)
    const rate   = await this.createBankRate.execute({ ...input, bankId })
    response.json(rate, 201)
  }
}
