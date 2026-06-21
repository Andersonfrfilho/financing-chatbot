import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import type { ListLeadsUseCase } from '../../application/use-cases/ListLeadsUseCase'
import type { GetLeadUseCase } from '../../application/use-cases/GetLeadUseCase'
import type { UpdateLeadStatusUseCase } from '../../application/use-cases/UpdateLeadStatusUseCase'

const updateSchema = z.object({
  status:     z.enum(['new','qualified','disqualified','negotiating','proposal_sent','won','lost']).optional(),
  assignedTo: z.string().uuid().optional(),
  notes:      z.string().optional(),
})

export class LeadController {
  constructor(
    private readonly listLeads:        ListLeadsUseCase,
    private readonly getLead:          GetLeadUseCase,
    private readonly updateLeadStatus: UpdateLeadStatusUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listLeads.execute({
      status:     q['status'],
      assignedTo: q['assignedTo'],
      startDate:  q['startDate'],
      endDate:    q['endDate'],
      page:       q['page']  ? Number(q['page'])  : undefined,
      limit:      q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const lead = await this.getLead.execute(request.params['id'] ?? '')
    response.json(lead)
  }

  async update(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = updateSchema.parse(request.body)
    const lead  = await this.updateLeadStatus.execute(
      request.params['id'] ?? '',
      input.status ?? '',
      input.assignedTo,
      input.notes,
    )
    response.json(lead)
  }
}
