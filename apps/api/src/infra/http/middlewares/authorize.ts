import { ForbiddenError, UnauthorizedError } from '@/shared/errors/AppError'
import type { Handler } from '@/infra/http/router'

export function authorize(permissions: string[]): Handler {
  return async (request, _response) => {
    const payload = request.user
    if (!payload) throw new UnauthorizedError('Not authenticated')

    const hasPermission = permissions.every((perm) => {
      const [resource, action] = perm.split(':')
      return payload.permissions.some(
        (p) =>
          (p.resource === '*' && p.action === '*') ||
          (p.resource === resource && p.action === action) ||
          (p.resource === resource && p.action === '*'),
      )
    })

    if (!hasPermission) {
      throw new ForbiddenError(`Missing permission: ${permissions.join(', ')}`)
    }
  }
}
