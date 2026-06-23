import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Copy, LogOut, Power } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui'

const SSE_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

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

const REMINDER_MESSAGES: Record<string, string> = {
  awaiting_menu: 'Bem-vindo de volta! 👋 Qual é seu interesse?',
  awaiting_hab_type: 'Voltamos aqui! 👋 Qual é a sua necessidade?',
  awaiting_vehicle_model: 'Continuamos aqui! 👋 Qual veículo você está procurando?',
  awaiting_financing_type: 'Estamos de volta! 👋 Vamos prosseguir com sua solicitação?',
  in_flow: 'Desculpe a demora! 😊 Continuamos preenchendo os dados...',
  simulation_ready: 'Sua simulação está pronta! 🎉 Quer revisar os resultados?',
  new: 'Olá! 👋 Bem-vindo de volta!',
  default: 'Estamos aqui para ajudar! 😊 Como podemos continuar?',
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getMinutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60))
}

export function ConversationsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [waitingOnly, setWaitingOnly] = useState(false)
  const qc = useQueryClient()

  const { data: list } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['conversations', waitingOnly],
    queryFn: () => api.get('/conversations', { params: { limit: 50, waitingHuman: waitingOnly ? 'true' : undefined } }).then((r: any) => r.data),
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

  const [before, setBefore] = useState<string | null>(null)
  const { data: history } = useQuery<{ messages: Message[] }>({
    queryKey: ['conversation', selected, before],
    queryFn: () => api.get(`/conversations/${encodeURIComponent(selected!)}/messages`, { params: { limit: 50, before } }).then((r: any) => r.data),
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

  const finalize = useMutation({
    mutationFn: () => api.post(`/conversations/${encodeURIComponent(selected!)}/finalize`),
    onSuccess: () => {
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
  const send = useMutation({
    mutationFn: (body: string) => api.post(`/conversations/${encodeURIComponent(selected!)}/send`, { text: body }),
    onSuccess: () => { setText(''); refresh() },
  })
  const continueConversation = useMutation({
    mutationFn: (whatsapp: string) => {
      const conv = conversations.find((c) => c.whatsappNumber === whatsapp)
      const reminderMsg = REMINDER_MESSAGES[conv?.currentState ?? 'default'] || REMINDER_MESSAGES.default
      return api.post(`/conversations/${encodeURIComponent(whatsapp)}/send`, { text: reminderMsg })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history?.messages?.length, selected])

  // Scroll infinito: carregar antigas quando chega no topo
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    if (container.scrollTop < 100 && (history?.messages?.length ?? 0) >= 50) {
      const oldestMessage = history?.messages?.[0]
      if (oldestMessage && !before) {
        setBefore(oldestMessage.createdAt)
      }
    }
  }

  // SSE ao vivo (Fase C): refetch imediato ao chegar mensagem. Aditivo — se cair, o polling cobre.
  useEffect(() => {
    if (!selected) return
    const token = useAuthStore.getState().token
    if (!token) return
    const es = new EventSource(`${SSE_BASE}/conversations/${encodeURIComponent(selected)}/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('message', () => {
      qc.invalidateQueries({ queryKey: ['conversation', selected] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })
    return () => es.close()
  }, [selected, qc])

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
        <Button
          variant={waitingOnly ? 'default' : 'outline'}
          onClick={() => setWaitingOnly((v) => !v)}
        >
          ⏳ Aguardando atendimento{waitingCount > 0 ? ` (${waitingCount})` : ''}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Lista */}
        <div className="border rounded-lg overflow-y-auto bg-white">
          {conversations.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhuma conversa ainda.</p>}
          {conversations.map((c) => {
            const minAgo = getMinutesAgo(c.lastAt)
            const isStalled = c.mode === 'bot' && minAgo > 30
            return (
              <div
                key={c.whatsappNumber}
                className={`border-b hover:bg-gray-50 transition-colors ${selected === c.whatsappNumber ? 'bg-blue-50' : ''} ${c.waitingHuman ? 'border-l-4 border-l-yellow-400' : ''}`}
              >
                <button
                  onClick={() => openConversation(c.whatsappNumber)}
                  className="w-full text-left p-3"
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
                  {isStalled && <span className="text-[10px] text-orange-600 font-medium">⏱️ parada há {minAgo}m</span>}
                </button>
                {isStalled && (
                  <div className="px-3 pb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => continueConversation.mutate(c.whatsappNumber)}
                      disabled={continueConversation.isPending}
                      className="w-full text-xs"
                    >
                      {continueConversation.isPending ? '...' : '▶️ Continuar Atendimento'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Conversa */}
        <div className="lg:col-span-2 border rounded-lg flex flex-col bg-gray-50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Selecione uma conversa</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900">{current?.clientName ?? 'Cliente'}</div>
                  <div className="text-xs text-gray-500 font-mono">{selected}</div>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${isHuman ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isHuman ? '🧑‍💼 atendimento humano' : '🤖 bot ativo'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {isHuman ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => release.mutate()}
                      disabled={release.isPending}
                    >
                      <LogOut size={14} />
                      Devolver ao bot
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => takeover.mutate()}
                      disabled={takeover.isPending}
                    >
                      <Power size={14} />
                      Assumir conversa
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => finalize.mutate()}
                    disabled={finalize.isPending}
                  >
                    Finalizar
                  </Button>
                </div>
              </div>

              <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.direction === 'outbound'
                  const color = m.sender === 'agent' ? 'bg-green-100' : m.sender === 'bot' ? 'bg-blue-100' : 'bg-white'
                  const statusIcon = m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : ''
                  const statusColor = m.status === 'read' ? 'text-blue-600' : m.status === 'delivered' ? 'text-blue-400' : 'text-gray-400'
                  const isMedia = m.type !== 'text' && m.payload
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${color} relative`}>
                        <div className="text-[10px] text-gray-400 mb-0.5">{SENDER_LABEL[m.sender] ?? m.sender} · {fmtTime(m.createdAt)}</div>
                        {isMedia ? (
                          <div className="text-xs text-gray-500 bg-gray-200 rounded px-2 py-1">
                            📎 {m.type} — {m.content || 'Mídia'}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.content}</p>
                        )}
                        {mine && statusIcon && <div className={`text-[10px] ${statusColor} mt-1 text-right font-bold`}>{statusIcon}</div>}

                        {/* Ações ao hover */}
                        <div className="absolute -top-8 right-0 hidden group-hover:flex gap-1 bg-white border rounded shadow-md p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigator.clipboard.writeText(m.content || '')}
                            title="Copiar"
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Caixa de envio (assume a conversa automaticamente ao enviar) */}
              <div className="border-t bg-white p-2 flex gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder={isHuman ? 'Escreva uma mensagem...' : 'Escreva (assume a conversa ao enviar)...'}
                  rows={1}
                  className="flex-1"
                />
                <Button
                  onClick={submit}
                  disabled={send.isPending || !text.trim()}
                >
                  {send.isPending ? '...' : 'Enviar'}
                </Button>
              </div>
              {send.isError && <p className="px-3 pb-2 text-xs text-red-500">Falha ao enviar (fora da janela de 24h do WhatsApp ou config ausente).</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
