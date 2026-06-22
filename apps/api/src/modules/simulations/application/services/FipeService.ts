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

export interface FipeYear {
  codigo: string  // ex: "2014-1" (ano-combustível: 1=gasolina, 2=álcool, 3=diesel)
  nome: string    // ex: "2014 Gasolina"
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
    // Ordena nomes mais curtos primeiro: versões "padrão" (ex: "ASX 2.0 16V 160cv Aut.")
    // vêm antes de variantes blindadas/4x4 que podem não cobrir o ano solicitado.
    return data.modelos
      .filter((m) => m.nome.toUpperCase().includes(upper))
      .sort((a, b) => a.nome.length - b.nome.length)
  }

  // Lista os anos-combustível disponíveis para um modelo (necessário antes de buscar valor)
  async listYears(brandCode: string, modelCode: string): Promise<FipeYear[]> {
    try {
      const resp = await fetch(`${FIPE_BASE}/carros/marcas/${brandCode}/modelos/${modelCode}/anos`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) return []
      return await resp.json() as FipeYear[]
    } catch {
      return []
    }
  }

  // Busca valor FIPE pelo código exato do ano (ex: "2014-1")
  async getVehicleValueByYearCode(
    brandCode: string,
    modelCode: string,
    yearCode: string,
  ): Promise<FipeVehicleValue | null> {
    const url = `${FIPE_BASE}/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!resp.ok) return null
      const data = await resp.json() as FipeApiValue
      return this.parseApiValue(data)
    } catch {
      return null
    }
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
      return this.parseApiValue(data)
    } catch {
      return null
    }
  }

  private parseApiValue(data: FipeApiValue): FipeVehicleValue | null {
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
  }

  // Calcula o LTV (Loan-to-Value) = valor financiado / valor FIPE
  calcLtv(financedAmount: number, fipeValue: number): number {
    if (fipeValue <= 0) return 1
    return financedAmount / fipeValue
  }
}
