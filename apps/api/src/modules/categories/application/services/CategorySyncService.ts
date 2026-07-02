import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { Category } from '@/infra/database/schema'
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { APP_CONFIG_ACTIVE_CATALOG_KEY } from '@/modules/catalogs/shared/Catalog.constant'

export class CategorySyncService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
    private readonly appConfigRepository: AppConfigRepository,
  ) {}

  // Grava local sempre acontece antes. Aqui só tentamos refletir a categoria no Catálogo do
  // WhatsApp; qualquer falha (rede, config ausente, rejeição da Meta) nunca propaga — o
  // registro local fica marcado como 'error' e pode ser reprocessado depois.
  async sync(category: Category): Promise<Category> {
    try {
      const catalogId = await this.resolveCatalogId(category)
      const productSetInput = { name: category.name, categoryLabel: category.id, catalogId }
      const result = category.externalId
        ? await this.catalogProvider.updateProductSet({ productSetId: category.externalId, name: category.name })
        : await this.catalogProvider.createProductSet(productSetInput)
      const externalId = category.externalId ?? result.id
      return this.categoryRepository.updateSyncResult(category.id, { syncStatus: 'synced', externalId, syncError: null })
    } catch (error) {
      const syncError = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar com o WhatsApp'
      return this.categoryRepository.updateSyncResult(category.id, { syncStatus: 'error', syncError })
    }
  }

  private async resolveCatalogId(category: Category): Promise<string | undefined> {
    if (category.catalogId) return category.catalogId
    const defaultCatalogId = await this.appConfigRepository.getConfig(APP_CONFIG_ACTIVE_CATALOG_KEY)
    return defaultCatalogId ?? undefined
  }
}
