import type { Category } from '@/infra/database/schema'
import type { CategoryRepository, CreateCategoryInput } from '../../domain/repositories/CategoryRepository'
import type { CategorySyncService } from '../services/CategorySyncService'

export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly categorySyncService: CategorySyncService,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const category = await this.categoryRepository.create(input)
    return this.categorySyncService.sync(category)
  }
}
