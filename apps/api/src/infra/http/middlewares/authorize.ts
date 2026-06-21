import type { JwtPayload } from '@/shared/types'
import { ForbiddenError } from '@/shared/errors/AppError'

export function authorize(
  payload: JwtPayload,
  resource: string,
  action: string,
): void {
  const hasPermission = payload.permissions.some(
    (permission) =>
      (permission.resource === '*' && permission.action === '*') ||
      (permission.resource === resource && permission.action === action) ||
      (permission.resource === resource && permission.action === '*'),
  )

  if (!hasPermission) {
    throw new ForbiddenError(`Missing permission: ${resource}:${action}`)
  }
}
