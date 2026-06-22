import type { FipeCatalogService } from '../../infra/FipeCatalogService'
import type { FipeVehicleDetail } from './LookupFipePriceUseCase'

export interface GetFipeDetailInput {
  vehicleType: string
  brandCode: string
  modelCode: number
  yearCode: string  // ex: "2014-1"
}

// Monta o link de consulta oficial da FIPE. O site oficial (veiculos.fipe.org.br) é um
// formulário SPA sem deep-link por código, então retornamos a URL da consulta + o código
// FIPE para o usuário localizar o veículo.
export function buildFipeOfficialUrl(): string {
  return 'https://veiculos.fipe.org.br'
}

export class GetFipeDetailUseCase {
  constructor(private readonly catalog: FipeCatalogService) {}

  async execute(input: GetFipeDetailInput): Promise<(FipeVehicleDetail & { fipeUrl: string }) | null> {
    const fipeType = this.catalog.resolveType(input.vehicleType)
    if (!fipeType) return null

    const detail = await this.catalog.fetchDetail(fipeType, input.brandCode, input.modelCode, input.yearCode)
    if (!detail) return null

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
}
