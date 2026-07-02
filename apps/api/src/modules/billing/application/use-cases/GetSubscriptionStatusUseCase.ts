import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { BILLING_CONFIG_KEY, DEFAULT_GRACE_DAYS, MS_PER_DAY } from '../../shared/Billing.constant'

export type SubscriptionState = 'active' | 'grace' | 'locked'

export type GetSubscriptionStatusResult = {
  readonly state: SubscriptionState
  readonly paidUntil: string | null
  readonly graceDays: number
  readonly graceUntil: string | null
  readonly daysOverdue: number
}

export class GetSubscriptionStatusUseCase {
  constructor(private readonly appConfigRepository: AppConfigRepository) {}

  async execute(): Promise<GetSubscriptionStatusResult> {
    const paidUntilRaw = await this.appConfigRepository.getConfig(BILLING_CONFIG_KEY.PAID_UNTIL)
    const graceDays = await this.appConfigRepository.getConfigAsNumber(BILLING_CONFIG_KEY.GRACE_DAYS, DEFAULT_GRACE_DAYS)

    if (!paidUntilRaw) {
      return { state: 'active', paidUntil: null, graceDays, graceUntil: null, daysOverdue: 0 }
    }

    const paidUntil = new Date(paidUntilRaw)
    const graceUntil = new Date(paidUntil.getTime() + graceDays * MS_PER_DAY)
    const now = new Date()

    if (now <= paidUntil) {
      return { state: 'active', paidUntil: paidUntilRaw, graceDays, graceUntil: graceUntil.toISOString(), daysOverdue: 0 }
    }

    const daysOverdue = Math.ceil((now.getTime() - paidUntil.getTime()) / MS_PER_DAY)

    if (now <= graceUntil) {
      return { state: 'grace', paidUntil: paidUntilRaw, graceDays, graceUntil: graceUntil.toISOString(), daysOverdue }
    }

    return { state: 'locked', paidUntil: paidUntilRaw, graceDays, graceUntil: graceUntil.toISOString(), daysOverdue }
  }
}
