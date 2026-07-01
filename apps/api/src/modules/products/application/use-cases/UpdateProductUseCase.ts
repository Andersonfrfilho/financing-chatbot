import type { Product } from '@/infra/database/schema'
import type { ProductRepository, UpdateProductInput } from '../../domain/repositories/ProductRepository'
import type { ProductSyncService } from '../services/ProductSyncService'
import { NotFoundError } from '@/shared/errors/AppError'

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productSyncService: ProductSyncService,
  ) {}

  async execute(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.productRepository.findById(id)
    if (!existing) throw new NotFoundError('Produto não encontrado')
    const product = await this.productRepository.update(id, input)
    return this.productSyncService.sync(product)
  }
}
