import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { Product } from '@/infra/database/schema'
import type { ProductRepository } from '../../domain/repositories/ProductRepository'

export class ProductSyncService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
  ) {}

  // Grava local sempre acontece antes. Aqui só tentamos refletir o produto no Catálogo do
  // WhatsApp; qualquer falha (rede, config ausente, rejeição da Meta) nunca propaga — o
  // registro local fica marcado como 'error' e pode ser reprocessado depois. custom_label_0
  // sempre reflete a categoria atual, então mover um produto de categoria é só um update normal.
  async sync(product: Product): Promise<Product> {
    try {
      const input = {
        retailerId:    product.retailerId,
        name:          product.name,
        description:   product.description ?? '',
        priceInCents:  product.priceInCents,
        currency:      product.currency,
        imageUrl:      product.imageUrl ?? '',
        categoryLabel: product.categoryId,
        availability:  product.availability,
        condition:     product.condition,
      }
      const result = product.externalId
        ? await this.catalogProvider.updateProduct({ productId: product.externalId, input })
        : await this.catalogProvider.createProduct(input)
      const externalId = product.externalId ?? result.id
      return this.productRepository.updateSyncResult(product.id, { syncStatus: 'synced', externalId, syncError: null })
    } catch (error) {
      const syncError = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar com o WhatsApp'
      return this.productRepository.updateSyncResult(product.id, { syncStatus: 'error', syncError })
    }
  }
}
