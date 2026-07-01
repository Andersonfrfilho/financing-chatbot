import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { ProductRepository } from '../../domain/repositories/ProductRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class DeleteProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
  ) {}

  async execute(id: string): Promise<void> {
    const product = await this.productRepository.findById(id)
    if (!product) throw new NotFoundError('Produto não encontrado')

    await this.productRepository.softDelete(id)

    if (product.externalId) {
      try {
        await this.catalogProvider.deleteProduct(product.externalId)
      } catch {
        // best-effort: exclusão local já ocorreu; o produto pode ficar órfão na Meta
      }
    }
  }
}
