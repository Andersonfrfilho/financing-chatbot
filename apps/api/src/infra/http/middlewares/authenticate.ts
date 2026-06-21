import { jwtVerify } from 'jose'
import type { JwtPayload } from '@/shared/types'
import { UnauthorizedError } from '@/shared/errors/AppError'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'changeme_jwt_32chars')

export async function authenticate(request: ParsedRequest, _response: ResponseHelper): Promise<void> {
  const authHeader = request.headers['authorization'] ?? null

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header')
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    request.user = payload as unknown as JwtPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}
