import { jwtVerify, SignJWT } from 'jose'
import type { UserRepository } from '../../domain/repositories/UserRepository'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { UnauthorizedError } from '@/shared/errors/AppError'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })())
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? 'changeme_refresh_32chars')
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '9h'

interface RefreshOutput {
  accessToken: string
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cache: CacheProvider,
  ) {}

  async execute(refreshToken: string): Promise<RefreshOutput> {
    let userId: string
    try {
      const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET)
      userId = payload.sub as string
    } catch {
      throw new UnauthorizedError('Invalid refresh token')
    }

    const stored = await this.cache.get(`refresh:${userId}`)
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedError('Refresh token revoked or not found')
    }

    const user = await this.userRepository.findById(userId)
    if (!user || !user.active) throw new UnauthorizedError('User not found or inactive')

    const accessToken = await new SignJWT({
      sub: user.id,
      role: user.role.name,
      permissions: user.role.permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_EXPIRES_IN)
      .sign(JWT_SECRET)

    return { accessToken }
  }
}
