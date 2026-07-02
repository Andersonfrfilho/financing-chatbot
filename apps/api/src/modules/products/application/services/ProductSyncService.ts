import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { Product } from '@/infra/database/schema'
import type { ProductRepository } from '../../domain/repositories/ProductRepository'
import type { CategoryRepository } from '@/modules/categories/domain/repositories/CategoryRepository'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { APP_CONFIG_ACTIVE_CATALOG_KEY } from '@/modules/catalogs/shared/Catalog.constant'

export class ProductSyncService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
    private readonly categoryRepository: CategoryRepository,
    private readonly appConfigRepository: AppConfigRepository,
  ) {}

  // Grava local sempre acontece antes. Aqui só tentamos refletir o produto no Catálogo do
  // WhatsApp; qualquer falha (rede, config ausente, rejeição da Meta) nunca propaga — o
  // registro local fica marcado como 'error' e pode ser reprocessado depois. custom_label_0
  // sempre reflete a categoria atual, então mover um produto de categoria é só um update normal.
  async sync(product: Product): Promise<Product> {
    try {
      const catalogId = await this.resolveCatalogId(product)
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
        catalogId,
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

  private async resolveCatalogId(product: Product): Promise<string | undefined> {
    const category = await this.categoryRepository.findById(product.categoryId)
    if (category?.catalogId) return category.catalogId
    const defaultCatalogId = await this.appConfigRepository.getConfig(APP_CONFIG_ACTIVE_CATALOG_KEY)
    return defaultCatalogId ?? undefined
  }
}
