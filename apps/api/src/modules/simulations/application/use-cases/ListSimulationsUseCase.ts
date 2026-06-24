import type { SimulationRepository, SimulationFilters } from '../../domain/repositories/SimulationRepository'

export class ListSimulationsUseCase {
  constructor(private readonly simulationRepository: SimulationRepository) {}

  async execute(filters: SimulationFilters) {
    return this.simulationRepository.findAll(filters)
  }
}
