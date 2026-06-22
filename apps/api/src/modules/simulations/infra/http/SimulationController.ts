import { z } from 'zod'
import type { CreateSimulationUseCase } from '../../application/use-cases/CreateSimulationUseCase'
import type { GetSimulationUseCase } from '../../application/use-cases/GetSimulationUseCase'
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
  ) {}

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(createSimulationSchema, request.body)
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
