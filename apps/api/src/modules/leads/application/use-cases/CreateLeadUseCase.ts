import type { LeadRepository, CreateLeadInput } from '../../domain/repositories/LeadRepository'
import { logger } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'

export class CreateLeadUseCase {
  constructor(private readonly repository: LeadRepository) {}

  async execute(input: CreateLeadInput) {
    const log_ = logger.child('CreateLeadUseCase.execute')

    log_.debug(LOG_EVENTS.CREATE_LEAD, { clientId: input.clientId, whatsappNumber: input.whatsappNumber })

    const lead = await this.repository.create(input)

    log_.info(LOG_EVENTS.CREATE_LEAD, { leadId: lead.id, clientId: input.clientId, status: lead.status })
    return lead
  }
}
