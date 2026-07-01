import type { ProductRepository, ProductFilters } from '../../domain/repositories/ProductRepository'

export class ListProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(filters: ProductFilters) {
    return this.productRepository.findAll(filters)
  }
}
