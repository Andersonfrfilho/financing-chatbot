import type { CategoryRepository } from '../../domain/repositories/CategoryRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class GetCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string) {
    const category = await this.categoryRepository.findById(id)
    if (!category) throw new NotFoundError('Categoria não encontrada')
    return category
  }
}
