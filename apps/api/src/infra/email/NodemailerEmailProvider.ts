import nodemailer from 'nodemailer'
import type { IEmailProvider, PasswordResetEmailInput } from '@/modules/auth/domain/providers/IEmailProvider'
import { logger } from '@/shared/logger'

const log = logger.child('NodemailerEmailProvider')

export class NodemailerEmailProvider implements IEmailProvider {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  async sendPasswordResetEmail({ to, name, resetUrl }: PasswordResetEmailInput): Promise<void> {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@example.com'
    const companyName = process.env.COMPANY_NAME_FALLBACK ?? 'Sistema'

    await this.transporter.sendMail({
      from: `"${companyName}" <${from}>`,
      to,
      subject: 'Redefinição de senha',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1d4ed8;margin:0 0 8px">Redefinição de senha</h2>
          <p style="color:#374151;margin:0 0 24px">Olá, <strong>${name}</strong>!</p>
          <p style="color:#374151;margin:0 0 24px">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
            Redefinir senha
          </a>
          <p style="color:#6b7280;font-size:13px;margin:0">
            O link expira em <strong>1 hora</strong>. Se não foi você, ignore este e-mail.
          </p>
          <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
            Ou copie o link: <br/><span style="color:#2563eb;word-break:break-all">${resetUrl}</span>
          </p>
        </div>
      `,
    })

    log.info('password_reset_email_sent', { to })
  }
}
