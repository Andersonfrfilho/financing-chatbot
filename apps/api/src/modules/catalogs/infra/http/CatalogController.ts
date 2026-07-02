import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { GetActiveCatalogUseCase } from '../../application/use-cases/GetActiveCatalogUseCase'
import type { SetActiveCatalogUseCase } from '../../application/use-cases/SetActiveCatalogUseCase'

const setActiveSchema = z.object({
  catalogId: z.string().min(1).max(255),
})

export class CatalogController {
  constructor(
    private readonly getActiveCatalog:  GetActiveCatalogUseCase,
    private readonly setActiveCatalog:  SetActiveCatalogUseCase,
  ) {}

  async getActive(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const active = await this.getActiveCatalog.execute()
    response.json(active)
  }

  async setActive(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = setActiveSchema.parse(request.body)
    const active = await this.setActiveCatalog.execute(input)
    response.json(active)
  }
}
