const GRAPH = 'https://graph.facebook.com'

export class WhatsAppSendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'WhatsAppSendError'
  }
}

export class WhatsAppSender {
  private getConfig() {
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    if (!phoneId || !token) {
      throw new WhatsAppSendError('WhatsApp não configurado (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)', 500)
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
      throw new WhatsAppSendError('Falha de rede ao enviar pelo WhatsApp', 502)
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      throw new WhatsAppSendError(`WhatsApp recusou o envio (${resp.status}): ${txt.slice(0, 300)}`, resp.status)
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
    } catch {
      throw new WhatsAppSendError('Falha de rede ao fazer upload de mídia', 502)
    }

    if (!uploadResp.ok) {
      const txt = await uploadResp.text().catch(() => '')
      throw new WhatsAppSendError(`Falha no upload de mídia (${uploadResp.status}): ${txt.slice(0, 300)}`, uploadResp.status)
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
    } catch {
      throw new WhatsAppSendError('Falha de rede ao enviar mídia pelo WhatsApp', 502)
    }

    if (!msgResp.ok) {
      const txt = await msgResp.text().catch(() => '')
      throw new WhatsAppSendError(`WhatsApp recusou o envio de mídia (${msgResp.status}): ${txt.slice(0, 300)}`, msgResp.status)
    }

    const data = (await msgResp.json().catch(() => ({}))) as { messages?: Array<{ id: string }> }
    return { waMessageId: data.messages?.[0]?.id ?? null }
  }

  async fetchMediaAsBase64(mediaId: string): Promise<{ data: string; mimeType: string }> {
    const { version, token } = this.getConfig()

    const urlResp = await fetch(`${GRAPH}/${version}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!urlResp.ok) {
      throw new WhatsAppSendError(`Não foi possível obter URL de mídia (${urlResp.status})`, urlResp.status)
    }

    const { url, mime_type } = (await urlResp.json()) as { url: string; mime_type: string }

    const dataResp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (!dataResp.ok) {
      throw new WhatsAppSendError(`Não foi possível baixar mídia (${dataResp.status})`, dataResp.status)
    }

    const arrayBuffer = await dataResp.arrayBuffer()
    return { data: Buffer.from(arrayBuffer).toString('base64'), mimeType: mime_type }
  }
}
