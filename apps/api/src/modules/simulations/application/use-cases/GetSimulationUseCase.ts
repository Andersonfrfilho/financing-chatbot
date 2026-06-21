import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { NotFoundError } from '@/shared/errors/AppError'
import * as schema from '@/infra/database/schema'

export class GetSimulationUseCase {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async execute(simulationId: string) {
    const simulation = await this.db.query.financingSimulations.findFirst({
      where: eq(schema.financingSimulations.id, simulationId),
      with: {
        results: {
          with: { bank: true },
        },
        client: true,
      },
    })

    if (!simulation) throw new NotFoundError('Simulação não encontrada')
    return simulation
  }
}
