import { z } from 'zod'
import type { LookupFipePriceUseCase } from '../../application/use-cases/LookupFipePriceUseCase'
import type { ListFipeModelsUseCase } from '../../application/use-cases/ListFipeModelsUseCase'
import type { ListFipeYearsUseCase } from '../../application/use-cases/ListFipeYearsUseCase'
import type { GetFipeDetailUseCase } from '../../application/use-cases/GetFipeDetailUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'

const vehicleType = z.enum(['car', 'motorcycle', 'truck', 'other'])

const priceSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1990).max(2030),
  fuel: z.enum(['flex', 'gasoline', 'diesel', 'electric', 'hybrid']),
  vehicleType,
})

const modelsSchema = z.object({
  brand: z.string().min(1),
  query: z.string().min(1),
  vehicleType,
})

const yearsSchema = z.object({
  brandCode: z.string().min(1),
  modelCode: z.coerce.number().int(),
  vehicleType,
})

const detailSchema = z.object({
  brandCode: z.string().min(1),
  modelCode: z.coerce.number().int(),
  yearCode: z.string().min(1),
  vehicleType,
})

export class FipeController {
  constructor(
    private readonly lookupFipePriceUseCase: LookupFipePriceUseCase,
    private readonly listFipeModelsUseCase: ListFipeModelsUseCase,
    private readonly listFipeYearsUseCase: ListFipeYearsUseCase,
    private readonly getFipeDetailUseCase: GetFipeDetailUseCase,
  ) {}

  async price(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(priceSchema, request.query)
    const result = await this.lookupFipePriceUseCase.execute(input)
    response.json({ found: result !== null, data: result })
  }

  async models(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(modelsSchema, request.query)
    const result = await this.listFipeModelsUseCase.execute(input)
    response.json({ found: result.models.length > 0, ...result })
  }

  async years(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(yearsSchema, request.query)
    const years = await this.listFipeYearsUseCase.execute(input)
    response.json({ found: years.length > 0, years })
  }

  async detail(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(detailSchema, request.query)
    const result = await this.getFipeDetailUseCase.execute(input)
    response.json({ found: result !== null, data: result })
  }
}
