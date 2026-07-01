import {
  WhatsAppError,
  WhatsAppConfigError,
  WhatsAppConnectionError,
  WhatsAppTimeoutError,
  WhatsAppWindowExpiredError,
} from '@adatechnology/whatsapp-provider'
import type { WhatsAppMessageProvider } from '@adatechnology/whatsapp-provider'
import { AppError } from '@/shared/errors/AppError'

function toAppError(error: WhatsAppError): AppError {
  if (error instanceof WhatsAppConfigError) {
    return new AppError(
      'A integração com WhatsApp não está configurada. Verifique WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN nas variáveis de ambiente.',
      503,
      'WHATSAPP_CONFIG_MISSING',
    )
  }
  if (error instanceof WhatsAppWindowExpiredError) return new AppError(error.message, 400, 'WHATSAPP_WINDOW_EXPIRED')
  if (error instanceof WhatsAppConnectionError || error instanceof WhatsAppTimeoutError) {
    return new AppError(error.message, 502, 'WHATSAPP_NETWORK_ERROR')
  }
  return new AppError(error.message, 502, 'WHATSAPP_SEND_ERROR')
}

export class WhatsAppSender {
  constructor(private readonly messageProvider: WhatsAppMessageProvider) {}

  private async run<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof WhatsAppError) throw toAppError(error)
      throw error
    }
  }

  async sendText(to: string, body: string): Promise<{ waMessageId: string | null }> {
    return this.run(() => this.messageProvider.sendText(to, body))
  }

  async sendMedia(
    to: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
    caption?: string,
  ): Promise<{ waMessageId: string | null }> {
    return this.run(() => this.messageProvider.sendMedia({ to, buffer, mimeType, filename, caption }))
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode = 'pt_BR',
    bodyParameters: string[] = [],
  ): Promise<{ waMessageId: string | null }> {
    return this.run(() => this.messageProvider.sendTemplate({ to, templateName, languageCode, bodyParameters }))
  }

  async fetchMediaAsBase64(mediaId: string): Promise<{ data: string; mimeType: string }> {
    return this.run(() => this.messageProvider.fetchMediaAsBase64(mediaId))
  }
}
