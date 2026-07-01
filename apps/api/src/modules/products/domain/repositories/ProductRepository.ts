import type { Product } from '@/infra/database/schema'

export type ProductAvailability = 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued'
export type ProductCondition    = 'new' | 'refurbished' | 'used'

export type CreateProductInput = {
  categoryId:    string
  retailerId:    string
  name:          string
  description?:  string
  priceInCents:  number
  currency?:     string
  imageUrl?:     string
  active?:       boolean
  availability?: ProductAvailability
  condition?:    ProductCondition
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'retailerId'>>

export type ProductSyncResult = {
  syncStatus:  'synced' | 'error'
  externalId?: string
  syncError?:  string | null
}

export type ProductFilters = {
  search?:     string
  categoryId?: string
  active?:     boolean
  page?:       number
  limit?:      number
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>
  findAll(filters: ProductFilters): Promise<{ data: Product[]; total: number }>
  create(input: CreateProductInput): Promise<Product>
  update(id: string, input: UpdateProductInput): Promise<Product>
  updateSyncResult(id: string, result: ProductSyncResult): Promise<Product>
  softDelete(id: string): Promise<void>
}
