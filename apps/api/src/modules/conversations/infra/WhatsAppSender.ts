import { AppError } from '@/shared/errors/AppError'

const GRAPH = 'https://graph.facebook.com'

const WINDOW_EXPIRED_CODES = new Set([
  131047, // Re-engagement message (outside 24h window)
  131026, // Message undeliverable
  131000, // Something went wrong (session expired variant)
])

function parseWaErrorCode(text: string): number | undefined {
  try {
    return (JSON.parse(text) as any)?.error?.code as number | undefined
  } catch {
    return undefined
  }
}

export class WhatsAppSender {
  private getConfig() {
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    if (!phoneId || !token) {
      throw new AppError(
        'A integração com WhatsApp não está configurada. Verifique WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN nas variáveis de ambiente.',
        503,
        'WHATSAPP_CONFIG_MISSING',
      )
    }
    return { version, phoneId, token }
  }

  async sendText(to: string, body: string): Promise<{ waMessageId: string | null }> {
    const { version, phoneId, token } = this.getConfig()

    let resp: Response
    try {
      resp = await fetch(`${GRAPH}/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body },
        }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      throw new AppError('Falha de rede ao tentar enviar pelo WhatsApp. Verifique a conexão e tente novamente.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!resp.ok) {
      const responseText = await resp.text().catch(() => '')
      const waCode = parseWaErrorCode(responseText)
      if (waCode !== undefined && WINDOW_EXPIRED_CODES.has(waCode)) {
        throw new AppError(
          'O cliente está fora da janela de 24h do WhatsApp. Não é possível enviar mensagens livres. Envie uma mensagem de template (HSM) pré-aprovada para reabrir a conversa.',
          400,
          'WHATSAPP_WINDOW_EXPIRED',
        )
      }
      throw new AppError(
        `WhatsApp recusou o envio (código ${waCode ?? resp.status}). ${responseText.slice(0, 200)}`,
        502,
        'WHATSAPP_SEND_ERROR',
      )
    }

    const data = (await resp.json().catch(() => ({}))) as { messages?: Array<{ id: string }> }
    return { waMessageId: data.messages?.[0]?.id ?? null }
  }

  async sendMedia(
    to: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
    caption?: string,
  ): Promise<{ waMessageId: string | null }> {
    const { version, phoneId, token } = this.getConfig()

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename)
    form.append('messaging_product', 'whatsapp')
    form.append('type', mimeType)

    let uploadResp: Response
    try {
      uploadResp = await fetch(`${GRAPH}/${version}/${phoneId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
    } catch (uploadError) {
      if (uploadError instanceof AppError) throw uploadError
      throw new AppError('Falha de rede ao fazer upload de mídia.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!uploadResp.ok) {
      const txt = await uploadResp.text().catch(() => '')
      throw new AppError(`Falha no upload de mídia (${uploadResp.status}): ${txt.slice(0, 200)}`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const { id: mediaId } = (await uploadResp.json()) as { id: string }

    const type = mimeType.startsWith('image/') ? 'image'
      : mimeType.startsWith('audio/') ? 'audio'
      : mimeType.startsWith('video/') ? 'video'
      : 'document'

    const mediaBody: Record<string, string> = { id: mediaId }
    if (type === 'document') mediaBody['filename'] = filename
    if (caption && (type === 'image' || type === 'video' || type === 'document')) mediaBody['caption'] = caption

    let msgResp: Response
    try {
      msgResp = await fetch(`${GRAPH}/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type,
          [type]: mediaBody,
        }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (msgError) {
      if (msgError instanceof AppError) throw msgError
      throw new AppError('Falha de rede ao enviar mídia pelo WhatsApp.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!msgResp.ok) {
      const responseText = await msgResp.text().catch(() => '')
      const waCode = parseWaErrorCode(responseText)
      if (waCode !== undefined && WINDOW_EXPIRED_CODES.has(waCode)) {
        throw new AppError(
          'O cliente está fora da janela de 24h do WhatsApp. Não é possível enviar mensagens livres. Envie uma mensagem de template (HSM) pré-aprovada para reabrir a conversa.',
          400,
          'WHATSAPP_WINDOW_EXPIRED',
        )
      }
      throw new AppError(`WhatsApp recusou o envio de mídia (código ${waCode ?? msgResp.status}).`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const data = (await msgResp.json().catch(() => ({}))) as { messages?: Array<{ id: string }> }
    return { waMessageId: data.messages?.[0]?.id ?? null }
  }

  async sendTemplate(to: string, templateName: string, languageCode = 'pt_BR'): Promise<{ waMessageId: string | null }> {
    const { version, phoneId, token } = this.getConfig()

    let resp: Response
    try {
      resp = await fetch(`${GRAPH}/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: templateName, language: { code: languageCode } },
        }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      throw new AppError('Falha de rede ao enviar template WhatsApp.', 502, 'WHATSAPP_NETWORK_ERROR')
    }

    if (!resp.ok) {
      const responseText = await resp.text().catch(() => '')
      const waCode = parseWaErrorCode(responseText)
      throw new AppError(
        `WhatsApp recusou o envio do template (código ${waCode ?? resp.status}). ${responseText.slice(0, 200)}`,
        502,
        'WHATSAPP_SEND_ERROR',
      )
    }

    const data = (await resp.json().catch(() => ({}))) as { messages?: Array<{ id: string }> }
    return { waMessageId: data.messages?.[0]?.id ?? null }
  }

  async fetchMediaAsBase64(mediaId: string): Promise<{ data: string; mimeType: string }> {
    const { version, token } = this.getConfig()

    const urlResp = await fetch(`${GRAPH}/${version}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!urlResp.ok) {
      throw new AppError(`Não foi possível obter URL de mídia (${urlResp.status})`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const { url, mime_type } = (await urlResp.json()) as { url: string; mime_type: string }

    const dataResp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (!dataResp.ok) {
      throw new AppError(`Não foi possível baixar mídia (${dataResp.status})`, 502, 'WHATSAPP_SEND_ERROR')
    }

    const arrayBuffer = await dataResp.arrayBuffer()
    return { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: mime_type }
  }
}
