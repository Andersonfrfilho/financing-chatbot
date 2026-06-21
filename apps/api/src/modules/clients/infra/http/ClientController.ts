import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListClientsUseCase } from '../../application/use-cases/ListClientsUseCase'
import type { GetClientUseCase } from '../../application/use-cases/GetClientUseCase'
import type { UpdateClientUseCase } from '../../application/use-cases/UpdateClientUseCase'
import type { DeleteClientUseCase } from '../../application/use-cases/DeleteClientUseCase'

const updateSchema = z.object({
  name:        z.string().min(3).optional(),
  email:       z.string().email().optional(),
  city:        z.string().optional(),
  state:       z.string().length(2).optional(),
  civilStatus: z.string().optional(),
})

export class ClientController {
  constructor(
    private readonly listClients:  ListClientsUseCase,
    private readonly getClient:    GetClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly deleteClient: DeleteClientUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listClients.execute({
      search: q['search'],
      city:   q['city'],
      state:  q['state'],
      page:   q['page']  ? Number(q['page'])  : undefined,
      limit:  q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const client = await this.getClient.execute(request.params['id'] ?? '')
    response.json(client)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input  = updateSchema.parse(request.body)
    const client = await this.updateClient.execute(request.params['id'] ?? '', input)
    response.json(client)
  }

  async remove(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.deleteClient.execute(request.params['id'] ?? '')
    response.json(null, 204)
  }
}
