import type { CategoryRepository, CategoryFilters } from '../../domain/repositories/CategoryRepository'

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(filters: CategoryFilters) {
    return this.categoryRepository.findAll(filters)
  }
}
