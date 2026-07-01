import type { Product } from '@/infra/database/schema'
import type { ProductRepository, CreateProductInput } from '../../domain/repositories/ProductRepository'
import type { ProductSyncService } from '../services/ProductSyncService'

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productSyncService: ProductSyncService,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const product = await this.productRepository.create(input)
    return this.productSyncService.sync(product)
  }
}
