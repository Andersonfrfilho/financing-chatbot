import { ForbiddenError } from '@/shared/errors/AppError'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'

export async function requireInternalToken(request: ParsedRequest, _response: ResponseHelper): Promise<void> {
  if (request.user?.role !== 'service') {
    throw new ForbiddenError('This endpoint is restricted to internal service calls')
  }
}
