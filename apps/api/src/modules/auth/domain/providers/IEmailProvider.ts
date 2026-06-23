export interface PasswordResetEmailInput {
  to: string
  name: string
  resetUrl: string
}

export interface IEmailProvider {
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>
}
