import type { DrizzleConversationRepository } from '../../infra/repositories/DrizzleConversationRepository'
import type { WhatsAppSender } from '../../infra/WhatsAppSender'
import type { SseHub } from '@/infra/sse/SseHub'
import { ValidationError } from '@/shared/errors/AppError'

export class SendAgentMediaUseCase {
  constructor(
    private readonly repo: DrizzleConversationRepository,
    private readonly sender: WhatsAppSender,
    private readonly sse?: SseHub,
  ) {}

  async execute(
    whatsapp: string,
    base64: string,
    mimeType: string,
    filename: string,
    caption: string,
    agentUserId: string,
  ) {
    if (!base64) throw new ValidationError('Conteúdo de mídia vazio')

    const buffer = Buffer.from(base64, 'base64')

    const session = await this.repo.getSessionMode(whatsapp)
    if (session && session.mode !== 'human') {
      await this.repo.setMode(whatsapp, 'human', agentUserId)
    }

    const { waMessageId } = await this.sender.sendMedia(whatsapp, buffer, mimeType, filename, caption || undefined)

    const type = mimeType.startsWith('image/') ? 'image'
      : mimeType.startsWith('audio/') ? 'audio'
      : mimeType.startsWith('video/') ? 'video'
      : 'document'

    const row = await this.repo.insertMessage({
      whatsappNumber: whatsapp,
      direction: 'outbound',
      sender: 'agent',
      agentUserId,
      type,
      content: caption || filename,
      waMessageId,
      status: 'sent',
      payload: { filename, mimeType, base64 },
    })

    if (row && this.sse) {
      this.sse.emit(`conv:${whatsapp}`, 'message', { id: row.id, direction: 'outbound', sender: 'agent' })
    }

    return { id: row?.id ?? null, waMessageId }
  }
}
