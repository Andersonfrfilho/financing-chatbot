import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { z } from 'zod'
import type { ListLeadsUseCase } from '../../application/use-cases/ListLeadsUseCase'
import type { GetLeadUseCase } from '../../application/use-cases/GetLeadUseCase'
import type { UpdateLeadStatusUseCase } from '../../application/use-cases/UpdateLeadStatusUseCase'

const updateSchema = z.object({
  status: z.enum(['novo', 'em_atendimento', 'proposta_enviada', 'aprovado', 'reprovado', 'cancelado', 'concluido']).optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export class LeadController {
  constructor(
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly updateLeadStatus: UpdateLeadStatusUseCase,
  ) {}

  async list(res: HttpResponse, req: HttpRequest) {
    const query = new URLSearchParams(req.getQuery())
    const result = await this.listLeads.execute({
      status: query.get('status') ?? undefined,
      assignedTo: query.get('assignedTo') ?? undefined,
      startDate: query.get('startDate') ?? undefined,
      endDate: query.get('endDate') ?? undefined,
      page: query.get('page') ? Number(query.get('page')) : undefined,
      limit: query.get('limit') ? Number(query.get('limit')) : undefined,
    })
    res.writeStatus('200 OK').end(JSON.stringify(result))
  }

  async get(res: HttpResponse, req: HttpRequest) {
    const id = req.getParameter(0)
    const lead = await this.getLead.execute(id)
    res.writeStatus('200 OK').end(JSON.stringify(lead))
  }

  async update(res: HttpResponse, req: HttpRequest, body: unknown) {
    const id = req.getParameter(0)
    const input = updateSchema.parse(body)
    const lead = await this.updateLeadStatus.execute(id, input.status ?? '', input.assignedTo, input.notes)
    res.writeStatus('200 OK').end(JSON.stringify(lead))
  }
}
