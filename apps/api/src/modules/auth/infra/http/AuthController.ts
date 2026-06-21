import { z } from 'zod'
import type { LoginUseCase } from '../../application/use-cases/LoginUseCase'
import type { RefreshTokenUseCase } from '../../application/use-cases/RefreshTokenUseCase'
import type { LogoutUseCase } from '../../application/use-cases/LogoutUseCase'
import type { ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { validateBody } from '@/infra/http/middlewares/validateBody'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  async login(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(loginSchema, request.body)
    const result = await this.loginUseCase.execute(input)
    response.json(result, 200)
  }

  async refresh(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    const input = validateBody(refreshSchema, request.body)
    const result = await this.refreshTokenUseCase.execute(input.refreshToken)
    response.json(result, 200)
  }

  async logout(request: ParsedRequest, response: ResponseHelper): Promise<void> {
    await this.logoutUseCase.execute(request.user!.sub)
    response.json({ message: 'Logged out successfully' }, 200)
  }
}
