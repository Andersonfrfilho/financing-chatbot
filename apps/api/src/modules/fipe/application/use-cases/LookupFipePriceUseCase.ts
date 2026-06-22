import type { FipeCatalogService } from '../../infra/FipeCatalogService'
import { buildFipeOfficialUrl } from './GetFipeDetailUseCase'

export interface FipeLookupInput {
  brand: string
  model: string
  year: number
  fuel: string
  vehicleType: string
}

export interface FipeVehicleDetail {
  codigoFipe: string
  marca: string
  modelo: string
  anoModelo: number
  combustivel: string
  preco: string
  mesReferencia: string
}

export class LookupFipePriceUseCase {
  constructor(private readonly catalog: FipeCatalogService) {}

  async execute(input: FipeLookupInput): Promise<(FipeVehicleDetail & { fipeUrl: string }) | null> {
    const fipeType = this.catalog.resolveType(input.vehicleType)
    if (!fipeType) return null

    const brand = await this.catalog.findBrand(fipeType, input.brand)
    if (!brand) return null

    // Vários modelos podem casar com o texto (ex: "Asx 2.0" casa com versões blindadas/4x4
    // que não cobrem todos os anos). Tenta cada candidato e usa o primeiro que tenha o ano.
    const models = await this.catalog.findModels(fipeType, brand.code, input.model)
    if (models.length === 0) return null

    for (const model of models) {
      const yearInfo = await this.catalog.findYear(fipeType, brand.code, model.code, input.year, input.fuel)
      if (!yearInfo) continue

      const detail = await this.catalog.fetchDetail(fipeType, brand.code, model.code, yearInfo.code)
      if (!detail) continue

      return {
        codigoFipe: detail.codeFipe,
        marca: detail.brand,
        modelo: detail.model,
        anoModelo: detail.modelYear,
        combustivel: detail.fuel,
        preco: detail.price,
        mesReferencia: detail.referenceMonth,
        fipeUrl: buildFipeOfficialUrl(),
      }
    }

    return null
  }
}
