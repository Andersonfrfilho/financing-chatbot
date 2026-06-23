import crypto from 'crypto'
import type { IEmailProvider } from '../../domain/providers/IEmailProvider'
import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { AppError } from '@/shared/errors/AppError'
import { db } from '@/infra/database/connection'
import { users } from '@/infra/database/schema'
import { eq } from 'drizzle-orm'

export class ForgotPasswordUseCase {
  constructor(
    private readonly emailProvider: IEmailProvider,
    private readonly configRepo: AppConfigRepository,
  ) {}

  async execute(email: string): Promise<void> {
    const emailEnabled = await this.configRepo.getConfig('email_reset_enabled')
    if (emailEnabled !== 'true') {
      throw new AppError('Recuperação de senha por e-mail não está habilitada.', 503, 'EMAIL_RESET_DISABLED')
    }

    const [user] = await db.select().from(users).where(eq(users.email, email as string)).limit(1)
    // Always return success to avoid user enumeration
    if (!user || !user.active) return

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.update(users).set({
      resetToken: tokenHash,
      resetTokenExpiresAt: expiresAt,
    }).where(eq(users.id, user.id))

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`

    await this.emailProvider.sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
  }
}
