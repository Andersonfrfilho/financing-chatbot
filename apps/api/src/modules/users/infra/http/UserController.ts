import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { z } from 'zod'
import type { ListUsersUseCase } from '../../application/use-cases/ListUsersUseCase'
import type { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase'
import type { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase'
import type { UserManagementRepository } from '../../domain/repositories/UserManagementRepository'

const createSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
})

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  roleId: z.string().uuid().optional(),
  active: z.boolean().optional(),
})

export class UserController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly userRepository: UserManagementRepository,
  ) {}

  async list(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const result = await this.listUsers.execute({
      search: query.get('search') ?? undefined,
      roleId: query.get('roleId') ?? undefined,
      active: query.has('active') ? query.get('active') === 'true' : undefined,
      page: query.get('page') ? Number(query.get('page')) : undefined,
      limit: query.get('limit') ? Number(query.get('limit')) : undefined,
    })
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async create(res: HttpResponse, req: HttpRequest, body: unknown) {
    const input = createSchema.parse(body)
    const user = await this.createUser.execute(input)
    res.writeStatus('201 Created').end(JSON.stringify(user))
  }

  async update(res: HttpResponse, req: HttpRequest, body: unknown) {
    const id = req.getParameter(0)
    const input = updateSchema.parse(body)
    const user = await this.updateUser.execute(id, input)
    res.writeStatus('200 OK').end(JSON.stringify(user))
  }

  async listRoles(res: HttpResponse) {
    const roleList = await this.userRepository.findAllRoles()
    res.writeStatus('200 OK').end(JSON.stringify(roleList))
  }
}
