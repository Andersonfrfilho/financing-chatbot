import type { FipeCatalogService } from '../../infra/FipeCatalogService'

export interface ListFipeModelsInput {
  vehicleType: string
  brand: string
  query: string
  limit?: number
}

export interface FipeModelOption {
  code: number
  name: string
}

export interface ListFipeModelsResult {
  brandCode: string | null
  brandName: string | null
  models: FipeModelOption[]
}

export class ListFipeModelsUseCase {
  constructor(private readonly catalog: FipeCatalogService) {}

  async execute(input: ListFipeModelsInput): Promise<ListFipeModelsResult> {
    const fipeType = this.catalog.resolveType(input.vehicleType)
    if (!fipeType) return { brandCode: null, brandName: null, models: [] }

    const brand = await this.catalog.findBrand(fipeType, input.brand)
    if (!brand) return { brandCode: null, brandName: null, models: [] }

    const models = await this.catalog.findModels(fipeType, brand.code, input.query)
    const limit = input.limit ?? 9 // WhatsApp: 10 linhas; deixa 1 p/ "não está na lista"
    return {
      brandCode: brand.code,
      brandName: brand.name,
      models: models.slice(0, limit).map(m => ({ code: m.code, name: m.name })),
    }
  }
}
