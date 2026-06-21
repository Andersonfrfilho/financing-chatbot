import type { CacheProvider } from '@/shared/providers/CacheProvider'

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

const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2'

const VEHICLE_TYPE_MAP: Record<string, string> = {
  car: 'cars',
  motorcycle: 'motorcycles',
  truck: 'trucks',
}

const FUEL_KEYWORDS: Record<string, string[]> = {
  flex: ['flex'],
  gasoline: ['gasolina', 'gasol'],
  diesel: ['diesel'],
  electric: ['elétrico', 'eletrico', 'electric'],
  hybrid: ['híbrido', 'hibrido', 'hybrid'],
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchText(input: string, candidate: string): boolean {
  const ni = normalize(input)
  const nc = normalize(candidate)
  if (ni === nc) return true
  if (nc.includes(ni) || ni.includes(nc)) return true
  const inputWords = ni.split(' ').filter(w => w.length > 1)
  const candidateWords = nc.split(' ').filter(w => w.length > 1)
  if (inputWords.length === 0) return false
  const matched = inputWords.filter(iw => candidateWords.some(cw => cw.includes(iw) || iw.includes(cw)))
  return matched.length >= Math.ceil(inputWords.length * 0.6)
}

function matchYear(year: number, yearCode: string): boolean {
  return yearCode.startsWith(String(year))
}

function matchFuel(fuel: string, yearName: string): boolean {
  const keywords = FUEL_KEYWORDS[fuel]
  if (!keywords) return false
  const normalized = normalize(yearName)
  return keywords.some(kw => normalized.includes(kw))
}

export class LookupFipePriceUseCase {
  constructor(private readonly cache: CacheProvider) {}

  async execute(input: FipeLookupInput): Promise<FipeVehicleDetail | null> {
    const fipeType = VEHICLE_TYPE_MAP[input.vehicleType]
    if (!fipeType) return null

    const brand = await this.findBrand(fipeType, input.brand)
    if (!brand) return null

    const model = await this.findModel(fipeType, brand.code, input.model)
    if (!model) return null

    const yearInfo = await this.findYear(fipeType, brand.code, model.code, input.year, input.fuel)
    if (!yearInfo) return null

    const detail = await this.fetchDetail(fipeType, brand.code, model.code, yearInfo.code)
    if (!detail) return null

    return {
      codigoFipe: detail.codeFipe,
      marca: detail.brand,
      modelo: detail.model,
      anoModelo: detail.modelYear,
      combustivel: detail.fuel,
      preco: detail.price,
      mesReferencia: detail.referenceMonth,
    }
  }

  private async fetchBrands(fipeType: string): Promise<Array<{ code: string; name: string }>> {
    const cacheKey = `fipe:brands:${fipeType}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const res = await fetch(`${FIPE_BASE}/${fipeType}/brands`)
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ code: string; name: string }>

    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  private async findBrand(fipeType: string, brandInput: string): Promise<{ code: string; name: string } | null> {
    const brands = await this.fetchBrands(fipeType)
    const match = brands.find(b => matchText(brandInput, b.name))
    return match ?? null
  }

  private async fetchModels(fipeType: string, brandCode: string): Promise<Array<{ code: number; name: string }>> {
    const cacheKey = `fipe:models:${fipeType}:${brandCode}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const res = await fetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models`)
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ code: number; name: string }>

    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  private async findModel(fipeType: string, brandCode: string, modelInput: string): Promise<{ code: number; name: string } | null> {
    const models = await this.fetchModels(fipeType, brandCode)
    const match = models.find(m => matchText(modelInput, m.name))
    return match ?? null
  }

  private async fetchYears(fipeType: string, brandCode: string, modelCode: number): Promise<Array<{ code: string; name: string }>> {
    const cacheKey = `fipe:years:${fipeType}:${brandCode}:${modelCode}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const res = await fetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models/${modelCode}/years`)
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ code: string; name: string }>

    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  private async findYear(
    fipeType: string, brandCode: string, modelCode: number,
    year: number, fuel: string,
  ): Promise<{ code: string; name: string } | null> {
    const years = await this.fetchYears(fipeType, brandCode, modelCode)
    const exactMatch = years.find(y => matchYear(year, y.code) && matchFuel(fuel, y.name))
    if (exactMatch) return exactMatch
    const yearMatch = years.find(y => matchYear(year, y.code))
    return yearMatch ?? null
  }

  private async fetchDetail(
    fipeType: string, brandCode: string, modelCode: number, yearCode: string,
  ): Promise<{
    codeFipe: string
    brand: string
    model: string
    modelYear: number
    fuel: string
    price: string
    referenceMonth: string
  } | null> {
    const res = await fetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`)
    if (!res.ok) return null
    return (await res.json()) as any
  }
}
