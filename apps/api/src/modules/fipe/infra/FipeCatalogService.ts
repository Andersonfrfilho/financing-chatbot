import type { CacheProvider } from '@/shared/providers/CacheProvider'

const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2'
const FIPE_TIMEOUT_MS = 8000

// fetch com timeout: a FIPE é externa; sem isso uma resposta lenta trava a requisição inteira.
function fipeFetch(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(FIPE_TIMEOUT_MS) })
}

export const VEHICLE_TYPE_MAP: Record<string, string> = {
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

export interface FipeBrand { code: string; name: string }
export interface FipeModel { code: number; name: string }
export interface FipeYear { code: string; name: string }
export interface FipeDetail {
  codeFipe: string
  brand: string
  model: string
  modelYear: number
  fuel: string
  price: string
  referenceMonth: string
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchText(input: string, candidate: string): boolean {
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

function matchYearCode(year: number, yearCode: string): boolean {
  return yearCode.startsWith(String(year))
}

function matchFuel(fuel: string, yearName: string): boolean {
  const keywords = FUEL_KEYWORDS[fuel]
  if (!keywords) return false
  const normalized = normalize(yearName)
  return keywords.some(kw => normalized.includes(kw))
}

// Serviço compartilhado de catálogo FIPE: HTTP + cache + matching.
// Usado por todos os use cases FIPE (preço por texto, listagem de modelos/anos, detalhe por código).
export class FipeCatalogService {
  constructor(private readonly cache: CacheProvider) {}

  resolveType(vehicleType: string): string | null {
    return VEHICLE_TYPE_MAP[vehicleType] ?? null
  }

  async fetchBrands(fipeType: string): Promise<FipeBrand[]> {
    const cacheKey = `fipe:brands:${fipeType}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)
    const res = await fipeFetch(`${FIPE_BASE}/${fipeType}/brands`)
    if (!res.ok) return []
    const data = (await res.json()) as FipeBrand[]
    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  async findBrand(fipeType: string, brandInput: string): Promise<FipeBrand | null> {
    const brands = await this.fetchBrands(fipeType)
    return brands.find(b => matchText(brandInput, b.name)) ?? null
  }

  async fetchModels(fipeType: string, brandCode: string): Promise<FipeModel[]> {
    const cacheKey = `fipe:models:${fipeType}:${brandCode}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)
    const res = await fipeFetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models`)
    if (!res.ok) return []
    const data = (await res.json()) as FipeModel[]
    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  // Todos os modelos que casam com o texto, versões "padrão" (nome mais curto) primeiro.
  async findModels(fipeType: string, brandCode: string, modelInput: string): Promise<FipeModel[]> {
    const models = await this.fetchModels(fipeType, brandCode)
    return models
      .filter(m => matchText(modelInput, m.name))
      .sort((a, b) => a.name.length - b.name.length)
  }

  async fetchYears(fipeType: string, brandCode: string, modelCode: number): Promise<FipeYear[]> {
    const cacheKey = `fipe:years:${fipeType}:${brandCode}:${modelCode}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return JSON.parse(cached)
    const res = await fipeFetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models/${modelCode}/years`)
    if (!res.ok) return []
    const data = (await res.json()) as FipeYear[]
    await this.cache.set(cacheKey, JSON.stringify(data), 86400)
    return data
  }

  async findYear(
    fipeType: string, brandCode: string, modelCode: number,
    year: number, fuel: string,
  ): Promise<FipeYear | null> {
    const years = await this.fetchYears(fipeType, brandCode, modelCode)
    const exact = years.find(y => matchYearCode(year, y.code) && matchFuel(fuel, y.name))
    if (exact) return exact
    return years.find(y => matchYearCode(year, y.code)) ?? null
  }

  async fetchDetail(
    fipeType: string, brandCode: string, modelCode: number, yearCode: string,
  ): Promise<FipeDetail | null> {
    const res = await fipeFetch(`${FIPE_BASE}/${fipeType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`)
    if (!res.ok) return null
    return (await res.json()) as FipeDetail
  }
}
