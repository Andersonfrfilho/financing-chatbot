import type { Product } from '@/infra/database/schema'
import type { CategoryRepository } from '@/modules/categories/domain/repositories/CategoryRepository'
import type { ProductAvailability, ProductCondition } from '../../domain/repositories/ProductRepository'
import type { CreateProductUseCase } from './CreateProductUseCase'

const BULK_IMPORT_CHUNK_SIZE = 20

export type BulkCreateProductRow = {
  categoryName:  string
  retailerId:    string
  name:          string
  description?:  string
  price:         string | number
  currency?:     string
  imageUrl?:     string
  availability?: ProductAvailability
  condition?:    ProductCondition
  active?:       boolean
}

export type BulkCreateProductsFailure = {
  row:   number
  error: string
}

export type BulkCreateProductsResult = {
  succeeded: Product[]
  failed:    BulkCreateProductsFailure[]
}

function toPriceInCents(price: string | number): number {
  const amount = typeof price === 'number' ? price : Number(price.replace(',', '.'))
  return Math.round(amount * 100)
}

function chunk<TItem>(items: readonly TItem[], size: number): TItem[][] {
  const chunks: TItem[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export class BulkCreateProductsUseCase {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly categoryRepository:   CategoryRepository,
  ) {}

  async execute(rows: readonly BulkCreateProductRow[]): Promise<BulkCreateProductsResult> {
    const succeeded: Product[] = []
    const failed: BulkCreateProductsFailure[] = []

    const indexedRows = rows.map((row, index) => ({ row, rowNumber: index + 1 }))

    for (const batch of chunk(indexedRows, BULK_IMPORT_CHUNK_SIZE)) {
      const results = await Promise.allSettled(
        batch.map(({ row }) => this.createOne(row)),
      )

      results.forEach((result, batchIndex) => {
        const rowNumber = batch[batchIndex]?.rowNumber ?? 0
        if (result.status === 'fulfilled') {
          succeeded.push(result.value)
          return
        }
        failed.push({ row: rowNumber, error: result.reason instanceof Error ? result.reason.message : String(result.reason) })
      })
    }

    return { succeeded, failed }
  }

  private async createOne(row: BulkCreateProductRow): Promise<Product> {
    const category = await this.categoryRepository.findByNameCaseInsensitive(row.categoryName)
    if (!category) {
      throw new Error(`Categoria "${row.categoryName}" não encontrada`)
    }

    return this.createProductUseCase.execute({
      categoryId:   category.id,
      retailerId:   row.retailerId,
      name:         row.name,
      description:  row.description,
      priceInCents: toPriceInCents(row.price),
      currency:     row.currency,
      imageUrl:     row.imageUrl,
      active:       row.active,
      availability: row.availability,
      condition:    row.condition,
    })
  }
}
