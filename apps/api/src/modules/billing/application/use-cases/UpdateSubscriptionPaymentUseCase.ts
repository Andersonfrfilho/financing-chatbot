import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { ValidationError } from '@/shared/errors/AppError'
import { BILLING_CONFIG_KEY, DEFAULT_GRACE_DAYS } from '../../shared/Billing.constant'

export type UpdateSubscriptionPaymentParams = {
  readonly paidUntil: string
  readonly graceDays?: number
}

export type UpdateSubscriptionPaymentResult = {
  readonly paidUntil: string
  readonly graceDays: number
}

export class UpdateSubscriptionPaymentUseCase {
  constructor(private readonly appConfigRepository: AppConfigRepository) {}

  async execute(params: UpdateSubscriptionPaymentParams): Promise<UpdateSubscriptionPaymentResult> {
    const parsedDate = new Date(params.paidUntil)
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ValidationError('paidUntil: invalid date')
    }

    const graceDays = params.graceDays ?? DEFAULT_GRACE_DAYS
    if (!Number.isInteger(graceDays) || graceDays < 0) {
      throw new ValidationError('graceDays: must be a non-negative integer')
    }

    await this.appConfigRepository.setConfig(BILLING_CONFIG_KEY.PAID_UNTIL, parsedDate.toISOString())
    await this.appConfigRepository.setConfig(BILLING_CONFIG_KEY.GRACE_DAYS, String(graceDays))

    return { paidUntil: parsedDate.toISOString(), graceDays }
  }
}
