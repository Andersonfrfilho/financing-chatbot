import type { Category } from '@/infra/database/schema'

export type CreateCategoryInput = {
  name:         string
  description?: string
  active?:      boolean
  catalogId?:   string | null
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

export type CategorySyncResult = {
  syncStatus:  'synced' | 'error'
  externalId?: string
  syncError?:  string | null
}

export type CategoryFilters = {
  search?: string
  active?: boolean
  page?:   number
  limit?:  number
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>
  findByNameCaseInsensitive(name: string): Promise<Category | null>
  findAll(filters: CategoryFilters): Promise<{ data: Category[]; total: number }>
  create(input: CreateCategoryInput): Promise<Category>
  update(id: string, input: UpdateCategoryInput): Promise<Category>
  updateSyncResult(id: string, result: CategorySyncResult): Promise<Category>
  softDelete(id: string): Promise<void>
  countActiveProducts(categoryId: string): Promise<number>
}
