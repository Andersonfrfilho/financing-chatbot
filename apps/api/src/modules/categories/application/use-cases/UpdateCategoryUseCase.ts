import type { Category } from '@/infra/database/schema'
import type { CategoryRepository, UpdateCategoryInput } from '../../domain/repositories/CategoryRepository'
import type { CategorySyncService } from '../services/CategorySyncService'
import { NotFoundError } from '@/shared/errors/AppError'

export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly categorySyncService: CategorySyncService,
  ) {}

  async execute(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.categoryRepository.findById(id)
    if (!existing) throw new NotFoundError('Categoria não encontrada')
    const category = await this.categoryRepository.update(id, input)
    return this.categorySyncService.sync(category)
  }
}
