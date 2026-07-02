import { PaymentRequiredError } from '@/shared/errors/AppError'
import type { Handler } from '@/infra/http/router'
import type { GetSubscriptionStatusUseCase } from '@/modules/billing/application/use-cases/GetSubscriptionStatusUseCase'

export function requireActiveSubscription(getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase): Handler {
  return async () => {
    const status = await getSubscriptionStatusUseCase.execute()
    if (status.state === 'locked') {
      throw new PaymentRequiredError('Assinatura em atraso. Regularize o pagamento para continuar usando o sistema.')
    }
  }
}
