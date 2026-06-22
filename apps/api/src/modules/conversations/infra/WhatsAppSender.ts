const GRAPH = 'https://graph.facebook.com'

export class WhatsAppSendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'WhatsAppSendError'
  }
}

// Envia mensagens pela Cloud API do WhatsApp (Graph). Usado no takeover (atendente → cliente).
// Requer env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION (opcional).
export class WhatsAppSender {
  async sendText(to: string, body: string): Promise<{ waMessageId: string | null }> {
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    if (!phoneId || !token) {
      throw new WhatsAppSendError('WhatsApp não configurado (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)', 500)
    }

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
      // 131047 / fora da janela de 24h → mensagem requer template (HSM) — fora do escopo do MVP
      throw new WhatsAppSendError(`WhatsApp recusou o envio (${resp.status}): ${txt.slice(0, 300)}`, resp.status)
    }

    const data = (await resp.json().catch(() => ({}))) as { messages?: Array<{ id: string }> }
    return { waMessageId: data.messages?.[0]?.id ?? null }
  }
}
