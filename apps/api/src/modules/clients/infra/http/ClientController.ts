import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { z } from 'zod'
import type { ListClientsUseCase } from '../../application/use-cases/ListClientsUseCase'
import type { GetClientUseCase } from '../../application/use-cases/GetClientUseCase'
import type { UpdateClientUseCase } from '../../application/use-cases/UpdateClientUseCase'
import type { DeleteClientUseCase } from '../../application/use-cases/DeleteClientUseCase'

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  civilStatus: z.string().optional(),
})

export class ClientController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly getClient: GetClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly deleteClient: DeleteClientUseCase,
  ) {}

  async list(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const result = await this.listClients.execute({
      search: query.get('search') ?? undefined,
      city: query.get('city') ?? undefined,
      state: query.get('state') ?? undefined,
      page: query.get('page') ? Number(query.get('page')) : undefined,
      limit: query.get('limit') ? Number(query.get('limit')) : undefined,
    })
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async get(res: HttpResponse, req: HttpRequest) {
    const id = req.getParameter(0)
    const client = await this.getClient.execute(id)
    res.writeStatus('200 OK').end(JSON.stringify(client))
  }

  async update(res: HttpResponse, req: HttpRequest, body: unknown) {
    const id = req.getParameter(0)
    const input = updateSchema.parse(body)
    const client = await this.updateClient.execute(id, input)
    res.writeStatus('200 OK').end(JSON.stringify(client))
  }

  async remove(res: HttpResponse, req: HttpRequest) {
    const id = req.getParameter(0)
    await this.deleteClient.execute(id)
    res.writeStatus('204 No Content').end()
  }
}
