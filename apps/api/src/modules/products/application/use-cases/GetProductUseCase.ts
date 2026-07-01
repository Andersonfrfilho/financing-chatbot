import type { ProductRepository } from '../../domain/repositories/ProductRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class GetProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string) {
    const product = await this.productRepository.findById(id)
    if (!product) throw new NotFoundError('Produto não encontrado')
    return product
  }
}
