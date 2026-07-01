import type { Product } from '@/infra/database/schema'
import type { ProductRepository } from '../../domain/repositories/ProductRepository'
import type { ProductSyncService } from '../services/ProductSyncService'
import { NotFoundError } from '@/shared/errors/AppError'

export class RetryProductSyncUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productSyncService: ProductSyncService,
  ) {}

  async execute(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id)
    if (!product) throw new NotFoundError('Produto não encontrado')
    return this.productSyncService.sync(product)
  }
}
