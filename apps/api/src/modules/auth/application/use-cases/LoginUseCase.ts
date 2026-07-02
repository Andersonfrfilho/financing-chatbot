import { verify } from '@node-rs/argon2'
import { SignJWT } from 'jose'
import type { UserRepository } from '../../domain/repositories/UserRepository'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { UnauthorizedError } from '@/shared/errors/AppError'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required') })())
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? 'changeme_refresh_32chars')
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '9h'
const REFRESH_EXPIRES_IN_SECONDS = Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60)

interface LoginInput {
  email: string
  password: string
}

interface LoginOutput {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string; passwordMustChange: boolean }
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cache: CacheProvider,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    console.log(`[Login] Tentativa: ${input.email}`)
    const user = await this.userRepository.findByEmail(input.email)
    console.log(`[Login] Usuário encontrado: ${user ? 'sim' : 'não'}`)
    if (!user || !user.active) {
      console.log(`[Login] Falha: usuário não encontrado ou inativo`)
      throw new UnauthorizedError('Invalid credentials')
    }

    const passwordValid = await verify(user.passwordHash, input.password)
    console.log(`[Login] Senha válida: ${passwordValid}`)
    if (!passwordValid) {
      console.log(`[Login] Falha: senha inválida`)
      throw new UnauthorizedError('Invalid credentials')
    }

    const payload = {
      sub: user.id,
      role: user.role.name,
      permissions: user.role.permissions,
    }

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_EXPIRES_IN)
      .sign(JWT_SECRET)

    const refreshToken = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_EXPIRES_IN_SECONDS}s`)
      .sign(JWT_REFRESH_SECRET)

    await this.cache.set(
      `refresh:${user.id}`,
      refreshToken,
      REFRESH_EXPIRES_IN_SECONDS,
    )

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        passwordMustChange: user.passwordMustChange,
      },
    }
  }
}
