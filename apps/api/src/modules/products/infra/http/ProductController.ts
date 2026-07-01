import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListProductsUseCase } from '../../application/use-cases/ListProductsUseCase'
import type { GetProductUseCase } from '../../application/use-cases/GetProductUseCase'
import type { CreateProductUseCase } from '../../application/use-cases/CreateProductUseCase'
import type { UpdateProductUseCase } from '../../application/use-cases/UpdateProductUseCase'
import type { DeleteProductUseCase } from '../../application/use-cases/DeleteProductUseCase'
import type { RetryProductSyncUseCase } from '../../application/use-cases/RetryProductSyncUseCase'

const availabilitySchema = z.enum(['in stock', 'out of stock', 'preorder', 'available for order', 'discontinued'])
const conditionSchema = z.enum(['new', 'refurbished', 'used'])

const createSchema = z.object({
  categoryId:    z.string().uuid(),
  retailerId:    z.string().min(1).max(255),
  name:          z.string().min(2).max(255),
  description:   z.string().max(1000).optional(),
  priceInCents:  z.number().int().nonnegative(),
  currency:      z.string().length(3).optional(),
  imageUrl:      z.string().url().optional(),
  active:        z.boolean().optional(),
  availability:  availabilitySchema.optional(),
  condition:     conditionSchema.optional(),
})

const updateSchema = z.object({
  categoryId:    z.string().uuid().optional(),
  name:          z.string().min(2).max(255).optional(),
  description:   z.string().max(1000).optional(),
  priceInCents:  z.number().int().nonnegative().optional(),
  currency:      z.string().length(3).optional(),
  imageUrl:      z.string().url().optional(),
  active:        z.boolean().optional(),
  availability:  availabilitySchema.optional(),
  condition:     conditionSchema.optional(),
})

export class ProductController {
  constructor(
    private readonly listProducts:     ListProductsUseCase,
    private readonly getProduct:       GetProductUseCase,
    private readonly createProduct:    CreateProductUseCase,
    private readonly updateProduct:    UpdateProductUseCase,
    private readonly deleteProduct:    DeleteProductUseCase,
    private readonly retryProductSync: RetryProductSyncUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listProducts.execute({
      search:     q['search'],
      categoryId: q['categoryId'],
      active:     q['active'] !== undefined ? q['active'] === 'true' : undefined,
      page:       q['page']  ? Number(q['page'])  : undefined,
      limit:      q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const product = await this.getProduct.execute(request.params['id'] ?? '')
    response.json(product)
  }

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = createSchema.parse(request.body)
    const product = await this.createProduct.execute(input)
    response.json(product, 201)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = updateSchema.parse(request.body)
    const product = await this.updateProduct.execute(request.params['id'] ?? '', input)
    response.json(product)
  }

  async remove(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.deleteProduct.execute(request.params['id'] ?? '')
    response.json(null, 204)
  }

  async retrySync(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const product = await this.retryProductSync.execute(request.params['id'] ?? '')
    response.json(product)
  }
}
