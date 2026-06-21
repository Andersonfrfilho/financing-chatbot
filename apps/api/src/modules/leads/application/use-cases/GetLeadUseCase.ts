import type { LeadRepository } from '../../domain/repositories/LeadRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class GetLeadUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(id: string) {
    const lead = await this.leadRepository.findById(id)
    if (!lead) throw new NotFoundError('Lead não encontrado')
    return lead
  }
}
