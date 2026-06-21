import type { DrizzleBankRepository } from '../../infra/repositories/DrizzleBankRepository'

export class ListBanksUseCase {
  constructor(private readonly bankRepository: DrizzleBankRepository) {}

  async execute(onlyActive?: boolean) {
    return this.bankRepository.findAll(onlyActive)
  }
}
