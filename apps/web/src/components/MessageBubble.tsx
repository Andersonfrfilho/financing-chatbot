import { Copy, Download, FileText, Music, Video } from 'lucide-react'
import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import { AudioPlayer } from '@/components/AudioPlayer'

export interface Message {
  id: string
  whatsappNumber: string
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'bot' | 'agent'
  type: string
  content: string | null
  payload: Record<string, unknown> | null
  status: string | null
  createdAt: string
  readAt?: string
}

const SENDER_LABEL: Record<string, string> = {
  customer: 'Cliente',
  bot: '🤖 Bot',
  agent: '🧑‍💼 Atendente'
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const statusIconMap = {
  sent: { icon: '✓', color: 'text-gray-400' },
  delivered: { icon: '✓✓', color: 'text-gray-400' },
  read: { icon: '✓✓', color: 'text-blue-600' },
  failed: { icon: '⚠', color: 'text-red-500' }
}

function MediaContent({ message, isMine }: { message: Message; isMine: boolean }) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const payload = message.payload as Record<string, any> | null
  const type = message.type

  // Outbound agent: base64 já salvo no payload
  if (payload?.base64) {
    const src = `data:${payload.mimeType};base64,${payload.base64}`
    if (type === 'image') {
      return (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt={payload.filename || 'imagem'} className="max-w-[220px] rounded-lg cursor-zoom-in" />
        </a>
      )
    }
    if (type === 'audio') return <AudioPlayer src={src} isMine={isMine} />
    if (type === 'video') return <video controls src={src} className="max-w-[220px] rounded-lg" />
    return (
      <a href={src} download={payload.filename || 'arquivo'} className="flex items-center gap-2 text-sm text-blue-700 underline">
        <FileText size={16} />
        {payload.filename || message.content || 'Documento'}
        <Download size={14} />
      </a>
    )
  }

  // Inbound customer: buscar via proxy
  const mediaObj = (payload?.image || payload?.audio || payload?.video || payload?.document || payload?.sticker) as Record<string, string> | undefined
  const mediaId = mediaObj?.id
  const filename = mediaObj?.filename || message.content || 'arquivo'

  if (!mediaId) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
        <FileText size={14} />
        <span>{type} — {message.content || 'Mídia'}</span>
      </div>
    )
  }

  const loadMedia = async () => {
    if (mediaSrc || loading) return
    setLoading(true)
    try {
      const r = await api.get(`/conversations/media/${mediaId}`)
      setMediaSrc(`data:${r.data.mimeType};base64,${r.data.data}`)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  if (type === 'image' || type === 'sticker') {
    if (!mediaSrc) {
      return (
        <button onClick={loadMedia} className="text-xs text-blue-600 underline flex items-center gap-1">
          {loading ? '⏳ Carregando...' : '🖼️ Ver imagem'}
        </button>
      )
    }
    return (
      <a href={mediaSrc} target="_blank" rel="noopener noreferrer">
        <img src={mediaSrc} alt="imagem" className="max-w-[220px] rounded-lg cursor-zoom-in" />
      </a>
    )
  }

  if (type === 'audio') {
    if (!mediaSrc) {
      return (
        <button onClick={loadMedia} className="text-xs text-blue-600 underline flex items-center gap-1">
          <Music size={14} /> {loading ? 'Carregando...' : 'Ouvir áudio'}
        </button>
      )
    }
    return <AudioPlayer src={mediaSrc} isMine={isMine} />
  }

  if (type === 'video') {
    if (!mediaSrc) {
      return (
        <button onClick={loadMedia} className="text-xs text-blue-600 underline flex items-center gap-1">
          <Video size={14} /> {loading ? 'Carregando...' : 'Ver vídeo'}
        </button>
      )
    }
    return <video controls src={mediaSrc} className="max-w-[220px] rounded-lg" />
  }

  // document genérico
  const downloadDoc = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/conversations/media/${mediaId}`)
      const a = document.createElement('a')
      a.href = `data:${r.data.mimeType};base64,${r.data.data}`
      a.download = filename
      a.click()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <button onClick={downloadDoc} className="flex items-center gap-2 text-sm text-blue-700 underline">
      <FileText size={16} />
      {filename}
      <Download size={14} />
      {loading && ' ⏳'}
    </button>
  )
}

interface MessageBubbleProps {
  message: Message
  isMine: boolean
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const senderLabel = SENDER_LABEL[message.sender] ?? message.sender
  const isBotOrAgent = message.sender !== 'customer'

  const bubbleColor = isBotOrAgent
    ? message.sender === 'agent' ? 'bg-green-100' : 'bg-blue-100'
    : 'bg-white'

  const statusDisplay = statusIconMap[message.status as keyof typeof statusIconMap]
  const isMedia = message.type !== 'text'
  const hasError = message.status === 'failed'

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div className={`
        max-w-[75%] rounded-2xl px-3 py-2 shadow-sm
        ${bubbleColor}
        ${hasError ? 'border-l-2 border-l-red-500 bg-red-50' : 'border border-gray-100'}
        relative
      `}>
        {!isMine && (
          <div className="text-[10px] text-gray-400 mb-0.5 font-medium">
            {senderLabel} · {fmtTime(message.createdAt)}
          </div>
        )}

        {isMedia ? (
          <MediaContent message={message} isMine={isMine} />
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {isMine && (
          <div className="flex items-end justify-between mt-1 gap-1">
            <span className="text-[10px] text-gray-400 font-medium">
              {fmtTime(message.createdAt)}
            </span>
            {statusDisplay && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span className={`text-[10px] font-bold cursor-help ${statusDisplay.color}`}>
                      {statusDisplay.icon}
                    </span>
                  </Tooltip.Trigger>
                  {message.status === 'read' && message.readAt && (
                    <Tooltip.Content
                      className="bg-blue-50 border border-blue-200 rounded px-2 py-1 shadow-md text-[11px] text-blue-700 font-medium whitespace-nowrap"
                      sideOffset={5}
                    >
                      Lido às {fmtTime(message.readAt)}
                    </Tooltip.Content>
                  )}
                  {message.status === 'failed' && (
                    <Tooltip.Content
                      className="bg-red-50 border border-red-200 rounded px-2 py-1 shadow-md text-[11px] text-red-700 font-medium"
                      sideOffset={5}
                    >
                      Falha: Fora da janela 24h
                    </Tooltip.Content>
                  )}
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
        )}

        {!isMedia && (
          <div className="absolute -top-8 right-0 hidden group-hover:flex gap-1 bg-white border border-gray-200 rounded shadow-md p-1">
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(message.content || '')} title="Copiar">
              <Copy size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
