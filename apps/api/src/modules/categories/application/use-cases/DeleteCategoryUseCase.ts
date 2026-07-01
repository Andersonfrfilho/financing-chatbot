import type { WhatsAppCatalogProvider } from '@adatechnology/whatsapp-provider'
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository'
import { NotFoundError, ConflictError } from '@/shared/errors/AppError'

export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly catalogProvider: WhatsAppCatalogProvider,
  ) {}

  async execute(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id)
    if (!category) throw new NotFoundError('Categoria não encontrada')

    const activeProducts = await this.categoryRepository.countActiveProducts(id)
    if (activeProducts > 0) throw new ConflictError('Não é possível excluir uma categoria com produtos ativos')

    await this.categoryRepository.softDelete(id)

    if (category.externalId) {
      try {
        await this.catalogProvider.deleteProductSet(category.externalId)
      } catch {
        // best-effort: exclusão local já ocorreu; o product set pode ficar órfão na Meta
      }
    }
  }
}
