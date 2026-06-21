import type { DrizzleBankRepository, CreateBankRateInput } from '../../infra/repositories/DrizzleBankRepository'

export class CreateBankRateUseCase {
  constructor(private readonly bankRepository: DrizzleBankRepository) {}

  async execute(input: CreateBankRateInput) {
    return this.bankRepository.upsertRate(input)
  }
}
