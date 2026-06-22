const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1'

export interface FipeVehicleValue {
  fipeCode: string
  brand: string
  model: string
  yearModel: number
  fuel: string
  referenceMonth: string
  value: number
}

export interface FipeBrand {
  codigo: string
  nome: string
}

export interface FipeModel {
  codigo: number
  nome: string
}

interface FipeApiValue {
  TipoVeiculo: number
  Valor: string
  Marca: string
  Modelo: string
  AnoModelo: number
  Combustivel: string
  CodigoFipe: string
  MesReferencia: string
  SiglaCombustivel: string
}

export class FipeService {
  async searchBrands(partialName: string): Promise<FipeBrand[]> {
    const resp = await fetch(`${FIPE_BASE}/carros/marcas`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) return []
    const brands = await resp.json() as FipeBrand[]
    const upper = partialName.toUpperCase()
    return brands.filter((b) => b.nome.toUpperCase().includes(upper))
  }

  async searchModels(brandCode: string, partialName: string): Promise<FipeModel[]> {
    const resp = await fetch(`${FIPE_BASE}/carros/marcas/${brandCode}/modelos`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) return []
    const data = await resp.json() as { modelos: FipeModel[] }
    const upper = partialName.toUpperCase()
    return data.modelos.filter((m) => m.nome.toUpperCase().includes(upper))
  }

  async getVehicleValue(
    brandCode: string,
    modelCode: string,
    year: number,
    fuel = 'G', // G=Gasolina, E=Etanol, D=Diesel
  ): Promise<FipeVehicleValue | null> {
    const yearCode = `${year}-${fuel === 'D' ? '3' : fuel === 'E' ? '2' : '1'}`
    const url = `${FIPE_BASE}/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!resp.ok) return null
      const data = await resp.json() as FipeApiValue

      const valueStr = data.Valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
      const value = parseFloat(valueStr)
      if (isNaN(value)) return null

      return {
        fipeCode: data.CodigoFipe,
        brand: data.Marca,
        model: data.Modelo,
        yearModel: data.AnoModelo,
        fuel: data.Combustivel,
        referenceMonth: data.MesReferencia,
        value,
      }
    } catch {
      return null
    }
  }

  // Busca o valor FIPE diretamente por código FIPE (mais rápido quando já conhecido)
  async getValueByFipeCode(fipeCode: string, year: number, fuel = 'G'): Promise<number | null> {
    // A API FIPE pública não suporta busca por código diretamente sem brand+model
    // Então retornamos null e usamos o fluxo brand+model
    return null
  }

  // Calcula o LTV (Loan-to-Value) = valor financiado / valor FIPE
  calcLtv(financedAmount: number, fipeValue: number): number {
    if (fipeValue <= 0) return 1
    return financedAmount / fipeValue
  }
}
