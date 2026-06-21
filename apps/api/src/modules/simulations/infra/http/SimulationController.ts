import { z } from 'zod'
import type { CreateSimulationUseCase } from '../../application/use-cases/CreateSimulationUseCase'
import type { GetSimulationUseCase } from '../../application/use-cases/GetSimulationUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { authenticate } from '@/infra/http/middlewares/authenticate'
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
  metadata: z.record(z.unknown()).optional(),
})

export class SimulationController {
  constructor(
    private readonly createSimulationUseCase: CreateSimulationUseCase,
    private readonly getSimulationUseCase: GetSimulationUseCase,
  ) {}

  async create(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await authenticate(request.headers['authorization'] ?? null)
    const input = validateBody(createSimulationSchema, request.body)
    const result = await this.createSimulationUseCase.execute(input)
    response.json(result, 201)
  }

  async get(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await authenticate(request.headers['authorization'] ?? null)
    const simulationId = request.url.split('/').pop() ?? ''
    const result = await this.getSimulationUseCase.execute(simulationId)
    response.json(result)
  }
}
