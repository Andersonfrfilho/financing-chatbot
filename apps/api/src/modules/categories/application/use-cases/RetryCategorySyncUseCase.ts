import type { Category } from '@/infra/database/schema'
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository'
import type { CategorySyncService } from '../services/CategorySyncService'
import { NotFoundError } from '@/shared/errors/AppError'

export class RetryCategorySyncUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly categorySyncService: CategorySyncService,
  ) {}

  async execute(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id)
    if (!category) throw new NotFoundError('Categoria não encontrada')
    return this.categorySyncService.sync(category)
  }
}
