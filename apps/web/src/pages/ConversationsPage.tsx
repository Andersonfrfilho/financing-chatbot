import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

type ConversationItem = {
  whatsappNumber: string
  lastContent: string | null
  lastDirection: string | null
  lastAt: string
  clientName: string | null
  currentState: string | null
}

type Message = {
  id: string
  whatsappNumber: string
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'bot' | 'agent'
  type: string
  content: string | null
  payload: Record<string, unknown> | null
  status: string | null
  createdAt: string
}

const SENDER_LABEL: Record<string, string> = { customer: 'Cliente', bot: '🤖 Bot', agent: '🧑‍💼 Atendente' }

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function ConversationsPage() {
  const [selected, setSelected] = useState<string | null>(null)

  // Lista de conversas — polling 20s (sem conexão persistente; barato no Railway)
  const { data: list } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations', { params: { limit: 50 } }).then((r) => r.data),
    refetchInterval: 20_000,
  })

  // Histórico da conversa aberta — polling 10s só enquanto há uma selecionada
  const { data: history } = useQuery<{ messages: Message[] }>({
    queryKey: ['conversation', selected],
    queryFn: () => api.get(`/conversations/${encodeURIComponent(selected!)}/messages`, { params: { limit: 50 } }).then((r) => r.data),
    enabled: !!selected,
    refetchInterval: selected ? 10_000 : false,
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history?.messages?.length, selected])

  const conversations = list?.conversations ?? []
  const messages = history?.messages ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Conversas</h2>
        <p className="text-gray-500 text-sm mt-1">Histórico das conversas do WhatsApp (atualiza a cada 20s)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Lista de conversas */}
        <div className="border rounded-lg overflow-y-auto bg-white">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-gray-400">Nenhuma conversa ainda.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.whatsappNumber}
              onClick={() => setSelected(c.whatsappNumber)}
              className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selected === c.whatsappNumber ? 'bg-blue-50' : ''}`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-gray-900 truncate">{c.clientName ?? c.whatsappNumber}</span>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">{fmtTime(c.lastAt)}</span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {c.lastDirection === 'outbound' ? '↩ ' : ''}{c.lastContent ?? ''}
              </p>
              {c.currentState && <span className="text-[10px] text-gray-400">{c.currentState}</span>}
            </button>
          ))}
        </div>

        {/* Histórico da conversa */}
        <div className="lg:col-span-2 border rounded-lg flex flex-col bg-gray-50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecione uma conversa para ver o histórico
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b bg-white text-sm font-medium text-gray-700">{selected}</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.direction === 'outbound'
                  const color = m.sender === 'agent' ? 'bg-green-100' : m.sender === 'bot' ? 'bg-blue-100' : 'bg-white'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${color}`}>
                        <div className="text-[10px] text-gray-400 mb-0.5">{SENDER_LABEL[m.sender] ?? m.sender} · {fmtTime(m.createdAt)}</div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              {/* Fase D: caixa de envio do atendente (takeover) entra aqui */}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
