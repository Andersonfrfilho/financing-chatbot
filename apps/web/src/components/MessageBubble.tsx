import { Copy } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Button } from '@/components/ui'

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
  const isMedia = message.type !== 'text' && message.payload
  const hasError = message.status === 'failed'

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div className={`
        max-w-[75%] rounded-lg px-3 py-2 shadow-sm
        ${bubbleColor}
        ${hasError ? 'border-l-2 border-l-red-500 bg-red-50' : 'border border-gray-100'}
        relative
      `}>
        {/* Sender + Timestamp (não-mine) */}
        {!isMine && (
          <div className="text-[10px] text-gray-400 mb-0.5 font-medium">
            {senderLabel} · {fmtTime(message.createdAt)}
          </div>
        )}

        {/* Content */}
        {isMedia ? (
          <div className="text-xs text-gray-500 bg-gray-200 rounded px-2 py-1">
            📎 {message.type} — {message.content || 'Mídia'}
          </div>
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Status para minhas mensagens */}
        {isMine && (
          <div className="flex items-end justify-between mt-1 gap-1">
            <span className="text-[10px] text-gray-400 font-medium">
              {fmtTime(message.createdAt)}
            </span>
            {statusDisplay && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span
                      className={`text-[10px] font-bold cursor-help ${statusDisplay.color} ${
                        message.status === 'delivered' ? 'animate-status-pulse' : ''
                      }`}
                    >
                      {statusDisplay.icon}
                    </span>
                  </Tooltip.Trigger>
                  {message.status === 'read' && message.readAt && (
                    <Tooltip.Content
                      className="bg-blue-50 border border-blue-200 rounded px-2 py-1 shadow-md
                                 text-[11px] text-blue-700 font-medium whitespace-nowrap"
                      sideOffset={5}
                    >
                      Lido às {fmtTime(message.readAt)}
                    </Tooltip.Content>
                  )}
                  {message.status === 'failed' && (
                    <Tooltip.Content
                      className="bg-red-50 border border-red-200 rounded px-2 py-1 shadow-md
                                 text-[11px] text-red-700 font-medium"
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

        {/* Ações ao hover */}
        <div className="absolute -top-8 right-0 hidden group-hover:flex gap-1
                        bg-white border border-gray-200 rounded shadow-md p-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(message.content || '')}
            title="Copiar"
          >
            <Copy size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
