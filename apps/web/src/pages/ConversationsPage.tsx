import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

type ConversationItem = {
  whatsappNumber: string
  lastContent: string | null
  lastDirection: string | null
  lastAt: string
  clientName: string | null
  currentState: string | null
  mode: string | null
  assignedUserId: string | null
  waitingHuman: boolean
  unread: number
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
  const [text, setText] = useState('')
  const [waitingOnly, setWaitingOnly] = useState(false)
  const qc = useQueryClient()

  const { data: list } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['conversations', waitingOnly],
    queryFn: () => api.get('/conversations', { params: { limit: 50, waitingHuman: waitingOnly ? 'true' : undefined } }).then((r) => r.data),
    refetchInterval: 20_000,
  })

  const markRead = useMutation({
    mutationFn: (n: string) => api.post(`/conversations/${encodeURIComponent(n)}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const openConversation = (n: string) => {
    setSelected(n)
    markRead.mutate(n)
  }

  const { data: history } = useQuery<{ messages: Message[] }>({
    queryKey: ['conversation', selected],
    queryFn: () => api.get(`/conversations/${encodeURIComponent(selected!)}/messages`, { params: { limit: 50 } }).then((r) => r.data),
    enabled: !!selected,
    refetchInterval: selected ? 10_000 : false,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['conversations'] })
    qc.invalidateQueries({ queryKey: ['conversation', selected] })
  }

  const takeover = useMutation({
    mutationFn: () => api.post(`/conversations/${encodeURIComponent(selected!)}/takeover`),
    onSuccess: refresh,
  })
  const release = useMutation({
    mutationFn: () => api.post(`/conversations/${encodeURIComponent(selected!)}/release`),
    onSuccess: refresh,
  })
  const send = useMutation({
    mutationFn: (body: string) => api.post(`/conversations/${encodeURIComponent(selected!)}/send`, { text: body }),
    onSuccess: () => { setText(''); refresh() },
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history?.messages?.length, selected])

  const conversations = list?.conversations ?? []
  const messages = history?.messages ?? []
  const current = conversations.find((c) => c.whatsappNumber === selected)
  const isHuman = current?.mode === 'human'
  const waitingCount = conversations.filter((c) => c.waitingHuman).length

  // Mantém a conversa aberta como lida ao chegar mensagem nova (polling)
  useEffect(() => {
    if (selected && (history?.messages?.length ?? 0) > 0) markRead.mutate(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history?.messages?.length])

  const submit = () => {
    const body = text.trim()
    if (body && !send.isPending) send.mutate(body)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conversas</h2>
          <p className="text-gray-500 text-sm mt-1">Histórico e atendimento via WhatsApp (atualiza a cada 20s)</p>
        </div>
        <button
          onClick={() => setWaitingOnly((v) => !v)}
          className={`text-sm px-3 py-1.5 rounded-lg border ${waitingOnly ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          ⏳ Aguardando atendimento{waitingCount > 0 ? ` (${waitingCount})` : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Lista */}
        <div className="border rounded-lg overflow-y-auto bg-white">
          {conversations.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhuma conversa ainda.</p>}
          {conversations.map((c) => (
            <button
              key={c.whatsappNumber}
              onClick={() => openConversation(c.whatsappNumber)}
              className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selected === c.whatsappNumber ? 'bg-blue-50' : ''} ${c.waitingHuman ? 'border-l-4 border-l-yellow-400' : ''}`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-gray-900 truncate">{c.clientName ?? c.whatsappNumber}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {c.unread > 0 && <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{c.unread}</span>}
                  <span className="text-[10px] text-gray-400">{fmtTime(c.lastAt)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastDirection === 'outbound' ? '↩ ' : ''}{c.lastContent ?? ''}</p>
              {c.waitingHuman && <span className="text-[10px] text-yellow-700 font-medium">⏳ aguardando atendimento</span>}
              {c.mode === 'human' && <span className="text-[10px] text-green-600 font-medium">🧑‍💼 em atendimento</span>}
            </button>
          ))}
        </div>

        {/* Conversa */}
        <div className="lg:col-span-2 border rounded-lg flex flex-col bg-gray-50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Selecione uma conversa</div>
          ) : (
            <>
              <div className="px-4 py-2 border-b bg-white flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  {current?.clientName ?? selected}
                  <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${isHuman ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isHuman ? 'atendimento humano' : 'bot ativo'}
                  </span>
                </div>
                {isHuman ? (
                  <button onClick={() => release.mutate()} disabled={release.isPending}
                    className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700">
                    Devolver ao bot
                  </button>
                ) : (
                  <button onClick={() => takeover.mutate()} disabled={takeover.isPending}
                    className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white">
                    Assumir conversa
                  </button>
                )}
              </div>

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

              {/* Caixa de envio (assume a conversa automaticamente ao enviar) */}
              <div className="border-t bg-white p-2 flex gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder={isHuman ? 'Escreva uma mensagem...' : 'Escreva (assume a conversa ao enviar)...'}
                  rows={1}
                  className="flex-1 resize-none border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button onClick={submit} disabled={send.isPending || !text.trim()}
                  className="px-4 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                  {send.isPending ? '...' : 'Enviar'}
                </button>
              </div>
              {send.isError && <p className="px-3 pb-2 text-xs text-red-500">Falha ao enviar (fora da janela de 24h do WhatsApp ou config ausente).</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
