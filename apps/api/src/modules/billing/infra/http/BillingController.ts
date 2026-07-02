import { z } from 'zod'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'
import type { GetSubscriptionStatusUseCase } from '../../application/use-cases/GetSubscriptionStatusUseCase'
import type { UpdateSubscriptionPaymentUseCase } from '../../application/use-cases/UpdateSubscriptionPaymentUseCase'

const updatePaymentSchema = z.object({
  paidUntil:  z.string().min(1),
  graceDays:  z.number().int().min(0).optional(),
})

export class BillingController {
  constructor(
    private readonly getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase,
    private readonly updateSubscriptionPaymentUseCase: UpdateSubscriptionPaymentUseCase,
  ) {}

  async getStatus(_req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const status = await this.getSubscriptionStatusUseCase.execute()
    res.json(status, 200)
  }

  async updatePayment(req: ParsedRequest, res: ResponseHelper): Promise<void> {
    const input = validateBody(updatePaymentSchema, req.body)
    const result = await this.updateSubscriptionPaymentUseCase.execute(input)
    res.json(result, 200)
  }
}
