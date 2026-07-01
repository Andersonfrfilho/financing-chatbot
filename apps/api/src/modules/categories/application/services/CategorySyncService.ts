import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { Category } from '@/infra/database/schema'
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository'

export class CategorySyncService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
  ) {}

  // Grava local sempre acontece antes. Aqui só tentamos refletir a categoria no Catálogo do
  // WhatsApp; qualquer falha (rede, config ausente, rejeição da Meta) nunca propaga — o
  // registro local fica marcado como 'error' e pode ser reprocessado depois.
  async sync(category: Category): Promise<Category> {
    try {
      const result = category.externalId
        ? await this.catalogProvider.updateProductSet({ productSetId: category.externalId, name: category.name })
        : await this.catalogProvider.createProductSet({ name: category.name, categoryLabel: category.id })
      const externalId = category.externalId ?? result.id
      return this.categoryRepository.updateSyncResult(category.id, { syncStatus: 'synced', externalId, syncError: null })
    } catch (error) {
      const syncError = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar com o WhatsApp'
      return this.categoryRepository.updateSyncResult(category.id, { syncStatus: 'error', syncError })
    }
  }
}
