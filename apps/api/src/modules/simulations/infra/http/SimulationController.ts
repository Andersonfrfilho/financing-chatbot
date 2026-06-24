import { z } from 'zod'
import type { CreateSimulationUseCase } from '../../application/use-cases/CreateSimulationUseCase'
import type { GetSimulationUseCase } from '../../application/use-cases/GetSimulationUseCase'
import type { ListSimulationsUseCase } from '../../application/use-cases/ListSimulationsUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'

const createSimulationSchema = z.object({
  whatsappNumber: z.string().optional().default('internal'),
  financingType: z.enum(['imobiliario', 'veiculo', 'pessoal', 'consignado', 'empresa', 'equipamento', 'rural']),
  requestedAmount: z.number().positive(),
  downPaymentAmount: z.number().min(0).default(0),
  termMonths: z.number().int().min(6).max(420),
  fgtsAmount: z.number().min(0).optional().default(0),
  propertyValue: z.number().positive().optional(),
  propertyType: z.enum(['residential', 'commercial', 'land', 'rural']).optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().length(2).optional(),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'other']).optional(),
  vehicleYear: z.number().int().min(1990).max(2030).optional(),
  // Descritivos do veículo: necessários para o lookup FIPE (valor de mercado/LTV)
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleFuel: z.string().optional(),
  // Renda: usada no comprometimento de renda (capacidade de pagamento)
  monthlyIncome: z.number().min(0).optional(),
  coParticipantIncome: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export class SimulationController {
  constructor(
    private readonly createSimulationUseCase: CreateSimulationUseCase,
    private readonly getSimulationUseCase: GetSimulationUseCase,
    private readonly listSimulationsUseCase: ListSimulationsUseCase,
  ) {}

  async list(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const q = request.query
    const result = await this.listSimulationsUseCase.execute({
      search:        q['search'],
      financingType: q['financingType'],
      startDate:     q['startDate'],
      endDate:       q['endDate'],
      page:          q['page']  ? Number(q['page'])  : undefined,
      limit:         q['limit'] ? Number(q['limit']) : undefined,
    })
    response.json(result)
  }

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    // n8n envia null para campos ausentes (JSON.stringify mantém null, só descarta undefined).
    // Zod .optional() aceita undefined mas não null — removemos as chaves null antes de validar.
    const raw = (request.body ?? {}) as Record<string, unknown>
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null))
    const input = validateBody(createSimulationSchema, cleaned)
    const result = await this.createSimulationUseCase.execute({
      ...input,
      whatsappNumber:    input.whatsappNumber    ?? 'internal',
      downPaymentAmount: input.downPaymentAmount ?? 0,
      fgtsAmount:        input.fgtsAmount        ?? 0,
    })
    response.json(result, 201)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const simulationId = request.url.split('/').pop() ?? ''
    const result = await this.getSimulationUseCase.execute(simulationId)
    response.json(result)
  }
}
