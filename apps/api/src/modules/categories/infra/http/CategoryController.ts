import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListCategoriesUseCase } from '../../application/use-cases/ListCategoriesUseCase'
import type { GetCategoryUseCase } from '../../application/use-cases/GetCategoryUseCase'
import type { CreateCategoryUseCase } from '../../application/use-cases/CreateCategoryUseCase'
import type { UpdateCategoryUseCase } from '../../application/use-cases/UpdateCategoryUseCase'
import type { DeleteCategoryUseCase } from '../../application/use-cases/DeleteCategoryUseCase'
import type { RetryCategorySyncUseCase } from '../../application/use-cases/RetryCategorySyncUseCase'

const createSchema = z.object({
  name:        z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  active:      z.boolean().optional(),
})

const updateSchema = z.object({
  name:        z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  active:      z.boolean().optional(),
})

export class CategoryController {
  constructor(
    private readonly listCategories:     ListCategoriesUseCase,
    private readonly getCategory:        GetCategoryUseCase,
    private readonly createCategory:     CreateCategoryUseCase,
    private readonly updateCategory:     UpdateCategoryUseCase,
    private readonly deleteCategory:     DeleteCategoryUseCase,
    private readonly retryCategorySync:  RetryCategorySyncUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listCategories.execute({
      search: q['search'],
      active: q['active'] !== undefined ? q['active'] === 'true' : undefined,
      page:   q['page']  ? Number(q['page'])  : undefined,
      limit:  q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const category = await this.getCategory.execute(request.params['id'] ?? '')
    response.json(category)
  }

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = createSchema.parse(request.body)
    const category = await this.createCategory.execute(input)
    response.json(category, 201)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = updateSchema.parse(request.body)
    const category = await this.updateCategory.execute(request.params['id'] ?? '', input)
    response.json(category)
  }

  async remove(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.deleteCategory.execute(request.params['id'] ?? '')
    response.json(null, 204)
  }

  async retrySync(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const category = await this.retryCategorySync.execute(request.params['id'] ?? '')
    response.json(category)
  }
}
