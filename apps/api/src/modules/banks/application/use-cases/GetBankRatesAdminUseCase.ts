import type { DrizzleBankRepository } from '../../infra/repositories/DrizzleBankRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class GetBankRatesAdminUseCase {
  constructor(private readonly bankRepository: DrizzleBankRepository) {}

  async execute(bankId: string, modality?: string) {
    const bank = await this.bankRepository.findById(bankId)
    if (!bank) throw new NotFoundError('Banco não encontrado')
    const rates = await this.bankRepository.getRates(bankId, modality)
    return { bank, rates }
  }
}
