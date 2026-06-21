import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListUsersUseCase } from '../../application/use-cases/ListUsersUseCase'
import type { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase'
import type { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase'
import type { UserManagementRepository } from '../../domain/repositories/UserManagementRepository'

const createSchema = z.object({
  name:     z.string().min(3),
  email:    z.string().email(),
  password: z.string().min(8),
  roleId:   z.string().uuid(),
})

const updateSchema = z.object({
  name:     z.string().min(3).optional(),
  email:    z.string().email().optional(),
  password: z.string().min(8).optional(),
  roleId:   z.string().uuid().optional(),
  active:   z.boolean().optional(),
})

export class UserController {
  constructor(
    private readonly listUsers:       ListUsersUseCase,
    private readonly createUser:      CreateUserUseCase,
    private readonly updateUser:      UpdateUserUseCase,
    private readonly userRepository:  UserManagementRepository,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listUsers.execute({
      search: q['search'],
      roleId: q['roleId'],
      active: q['active'] !== undefined ? q['active'] === 'true' : undefined,
      page:   q['page']  ? Number(q['page'])  : undefined,
      limit:  q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = createSchema.parse(request.body)
    const user  = await this.createUser.execute(input)
    response.json(user, 201)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = updateSchema.parse(request.body)
    const user  = await this.updateUser.execute(request.params['id'] ?? '', input)
    response.json(user)
  }

  async listRoles(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const roleList = await this.userRepository.findAllRoles()
    response.json(roleList)
  }
}
