import type { FipeCatalogService } from '../../infra/FipeCatalogService'

export interface ListFipeYearsInput {
  vehicleType: string
  brandCode: string
  modelCode: number
  limit?: number
}

export interface FipeYearOption {
  code: string   // ex: "2014-1"
  name: string   // ex: "2014 Gasolina"
  year: number
  fuel: string   // gasoline | flex | diesel | electric | hybrid
}

const FUEL_BY_DIGIT: Record<string, string> = {
  '1': 'gasoline',
  '2': 'flex',     // FIPE "Álcool"/flex
  '3': 'diesel',
}

function fuelFromName(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('diesel')) return 'diesel'
  if (n.includes('elétr') || n.includes('eletr')) return 'electric'
  if (n.includes('híbr') || n.includes('hibr')) return 'hybrid'
  if (n.includes('álcool') || n.includes('alcool') || n.includes('flex') || n.includes('etanol')) return 'flex'
  return 'gasoline'
}

export class ListFipeYearsUseCase {
  constructor(private readonly catalog: FipeCatalogService) {}

  async execute(input: ListFipeYearsInput): Promise<FipeYearOption[]> {
    const fipeType = this.catalog.resolveType(input.vehicleType)
    if (!fipeType) return []

    const years = await this.catalog.fetchYears(fipeType, input.brandCode, input.modelCode)
    const limit = input.limit ?? 9 // deixa 1 linha p/ "outro ano / digitar"
    return years.slice(0, limit).map((y) => {
      const [yearPart, fuelDigit] = y.code.split('-')
      return {
        code: y.code,
        name: y.name,
        year: parseInt(yearPart ?? '0', 10),
        fuel: FUEL_BY_DIGIT[fuelDigit ?? '1'] ?? fuelFromName(y.name),
      }
    })
  }
}
