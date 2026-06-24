import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListClientsUseCase } from '../../application/use-cases/ListClientsUseCase'
import type { GetClientUseCase } from '../../application/use-cases/GetClientUseCase'
import type { CreateClientUseCase } from '../../application/use-cases/CreateClientUseCase'
import type { UpdateClientUseCase } from '../../application/use-cases/UpdateClientUseCase'
import type { DeleteClientUseCase } from '../../application/use-cases/DeleteClientUseCase'
import type { FindClientByDocumentUseCase } from '../../application/use-cases/FindClientByDocumentUseCase'
import { validateBody } from '@/infra/http/middlewares/validateBody'

const createSchema = z.object({
  name:           z.string().min(2),
  whatsappNumber: z.string().min(8),
  email:          z.string().email().optional(),
  city:           z.string().optional(),
  state:          z.string().length(2).optional(),
})

const updateSchema = z.object({
  name:        z.string().min(3).optional(),
  email:       z.string().email().optional(),
  city:        z.string().optional(),
  state:       z.string().length(2).optional(),
  civilStatus: z.string().optional(),
})

const byDocumentSchema = z.object({
  cpf:      z.string().min(11),
  whatsapp: z.string().min(1),
})

export class ClientController {
  constructor(
    private readonly listClients:  ListClientsUseCase,
    private readonly getClient:    GetClientUseCase,
    private readonly createClient: CreateClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly deleteClient: DeleteClientUseCase,
    private readonly findClientByDocument: FindClientByDocumentUseCase,
  ) {}

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = createSchema.parse(request.body)
    const client = await this.createClient.execute({
      whatsappNumber: input.whatsappNumber,
      name:           input.name,
      email:          input.email,
      city:           input.city,
      state:          input.state,
    })
    response.json(client, 201)
  }

  async byDocument(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const { cpf, whatsapp } = validateBody(byDocumentSchema, request.query)
    const result = await this.findClientByDocument.execute(cpf, whatsapp)
    response.json(result)
  }

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listClients.execute({
      search:        q['search'],
      city:          q['city'],
      state:         q['state'],
      createdAfter:  q['createdAfter'],
      createdBefore: q['createdBefore'],
      page:          q['page']  ? Number(q['page'])  : undefined,
      limit:         q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const client = await this.getClient.execute(request.params['id'] ?? '')
    response.json(client)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input  = updateSchema.parse(request.body)
    const client = await this.updateClient.execute(request.params['id'] ?? '', {
      name:        input.name,
      email:       input.email,
      city:        input.city,
      state:       input.state,
    })
    response.json(client)
  }

  async remove(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.deleteClient.execute(request.params['id'] ?? '')
    response.json(null, 204)
  }
}
