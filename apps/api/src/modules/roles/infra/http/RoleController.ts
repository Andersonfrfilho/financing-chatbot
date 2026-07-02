import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListRolesUseCase } from '../../application/use-cases/ListRolesUseCase'
import type { CreateRoleUseCase } from '../../application/use-cases/CreateRoleUseCase'
import type { UpdateRoleUseCase } from '../../application/use-cases/UpdateRoleUseCase'
import type { DeleteRoleUseCase } from '../../application/use-cases/DeleteRoleUseCase'
import { PERMISSION_CATALOG } from '../../shared/PermissionCatalog.constant'

const permissionSchema = z.object({
  resource: z.string().min(1).max(100),
  action:   z.string().min(1).max(100),
})

const createSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(255).nullable().optional(),
  permissions: z.array(permissionSchema),
})

const updateSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  permissions: z.array(permissionSchema).optional(),
})

export class RoleController {
  constructor(
    private readonly listRoles:  ListRolesUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  async list(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const roleList = await this.listRoles.execute()
    response.json(roleList)
  }

  async permissionsCatalog(_request: ParsedRequest, response: ResponseHelper): Promise<void> {
    response.json(PERMISSION_CATALOG)
  }

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = createSchema.parse(request.body)
    const role = await this.createRole.execute(input)
    response.json(role, 201)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = updateSchema.parse(request.body)
    const role = await this.updateRole.execute(request.params['id'] ?? '', input)
    response.json(role)
  }

  async remove(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.deleteRole.execute(request.params['id'] ?? '')
    response.json(null, 204)
  }
}
