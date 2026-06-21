import { z } from 'zod'
import type { LookupFipePriceUseCase } from '../../application/use-cases/LookupFipePriceUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'

const fipeQuerySchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1990).max(2030),
  fuel: z.enum(['flex', 'gasoline', 'diesel', 'electric', 'hybrid']),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'other']),
})

export class FipeController {
  constructor(
    private readonly lookupFipePriceUseCase: LookupFipePriceUseCase,
  ) {}

  async price(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(fipeQuerySchema, request.query)
    const result = await this.lookupFipePriceUseCase.execute(input)
    response.json({ found: result !== null, data: result })
  }
}
