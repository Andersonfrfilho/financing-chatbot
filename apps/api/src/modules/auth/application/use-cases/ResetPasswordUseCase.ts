import crypto from 'crypto'
import { hash } from '@node-rs/argon2'
import { AppError } from '@/shared/errors/AppError'
import { db } from '@/infra/database/connection'
import { users } from '@/infra/database/schema'
import { eq, and, gt } from 'drizzle-orm'

export class ResetPasswordUseCase {
  async execute(rawToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new AppError('A senha deve ter no mínimo 8 caracteres.', 400, 'PASSWORD_TOO_SHORT')
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const now = new Date()

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.resetToken, tokenHash),
        gt(users.resetTokenExpiresAt!, now),
      ))
      .limit(1)

    if (!user) {
      throw new AppError('Token inválido ou expirado.', 400, 'INVALID_OR_EXPIRED_TOKEN')
    }

    const passwordHash = await hash(newPassword)

    await db.update(users).set({
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      passwordMustChange: false,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id))
  }
}
