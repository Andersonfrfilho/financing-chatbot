import type { LeadRepository } from '../../domain/repositories/LeadRepository'
import { NotFoundError } from '@/shared/errors/AppError'

export class UpdateLeadStatusUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(id: string, status: string, assignedTo?: string, notes?: string) {
    const lead = await this.leadRepository.findById(id)
    if (!lead) throw new NotFoundError('Lead não encontrado')
    return this.leadRepository.update(id, { status, assignedTo, notes })
  }
}
