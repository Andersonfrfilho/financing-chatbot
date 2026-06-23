import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, useMemo } from 'react'
import { LogOut, Power, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { MessageBubble } from '@/components/MessageBubble'
import { SelectionsSummary } from '@/components/SelectionsSummary'
import { Avatar } from '@/components/Avatar'

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
  readAt?: string
}

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

function contextToSelections(ctx: Record<string, unknown> | null): Record<string, any> {
  if (!ctx) return {}
  const labels: Record<string, string> = {
    cpf: 'CPF',
    city: 'Cidade',
    name: 'Nome Completo',
    email: 'E-mail',
    phone: 'Telefone',
    state: 'Estado',
    birthDate: 'Data de Nascimento',
    personType: 'Tipo de Pessoa',
    civilStatus: 'Estado Civil',
    vehicleType: 'Tipo de Veículo',
    vehicleBrand: 'Marca do Veículo',
    vehicleModel: 'Modelo do Veículo',
    financingType: 'Tipo de Financiamento',
    habitationType: 'Tipo de Habitação',
    installments: 'Parcelas',
    downPayment: 'Entrada',
    totalAmount: 'Valor Total',
  }

  const fieldOrder = [
    'name', 'cpf', 'email', 'phone', 'birthDate', 'state', 'city',
    'personType', 'civilStatus',
    'vehicleType', 'vehicleBrand', 'vehicleModel',
    'habitationType', 'financingType',
    'downPayment', 'installments', 'totalAmount'
  ]

  const selections: Record<string, any> = {}
  Object.entries(ctx).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      selections[key] = {
        step: key,
        label: labels[key] || key,
        value: String(value),
        selectedAt: new Date().toISOString(),
        status: 'completed' as const,
        order: fieldOrder.indexOf(key)
      }
    }
  })

  return selections
}

export function ConversationsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [waitingOnly, setWaitingOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set())
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

  const { data: context } = useQuery<Record<string, unknown>>({
    queryKey: ['conversation-context', selected],
    queryFn: () => api.get(`/conversations/${encodeURIComponent(selected!)}/context`).then((r: any) => r.data),
    enabled: !!selected,
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
    // Atualizar quando mensagem é lida (readAt recebido)
    es.addEventListener('message-read', () => {
      qc.invalidateQueries({ queryKey: ['conversation', selected] })
    })
    return () => es.close()
  }, [selected, qc])

  const conversations = list?.conversations ?? []
  const messages = history?.messages ?? []
  const current = conversations.find((c) => c.whatsappNumber === selected)
  const isHuman = current?.mode === 'human'
  const waitingCount = conversations.filter((c) => c.waitingHuman).length

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) => {
      const name = (c.clientName || c.whatsappNumber).toLowerCase()
      const content = (c.lastContent || '').toLowerCase()
      return name.includes(q) || content.includes(q) || c.whatsappNumber.includes(q)
    })
  }, [conversations, search])

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Lista - oculta em mobile quando conversa selecionada */}
        <div className={`border rounded-lg flex flex-col bg-white ${selected ? 'hidden md:flex' : ''}`}>
          {/* Ações em massa */}
          {selectedBulk.size > 0 && (
            <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-medium text-blue-700">{selectedBulk.size} selecionada(s)</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedBulk(new Set())}
                  className="text-xs"
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Finalizar ${selectedBulk.size} conversa(s)?`)) {
                      for (const whatsapp of selectedBulk) {
                        api.post(`/conversations/${encodeURIComponent(whatsapp)}/finalize`).catch(() => {})
                      }
                      qc.invalidateQueries({ queryKey: ['conversations'] })
                      setSelectedBulk(new Set())
                    }
                  }}
                  className="text-xs"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Conversas */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && conversations.length === 0 && <p className="p-4 text-sm text-gray-400">Nenhuma conversa ainda.</p>}
            {filteredConversations.length === 0 && conversations.length > 0 && <p className="p-4 text-sm text-gray-400">Nenhuma conversa encontrada.</p>}
            {filteredConversations.map((c) => {
            const minAgo = getMinutesAgo(c.lastAt)
            const isStalled = c.mode === 'bot' && minAgo > 30
            return (
              <div
                key={c.whatsappNumber}
                className={`border-b hover:bg-gray-50 transition-colors ${selected === c.whatsappNumber ? 'bg-blue-50' : selectedBulk.has(c.whatsappNumber) ? 'bg-blue-100' : ''} ${c.waitingHuman ? 'border-l-4 border-l-yellow-400' : ''}`}
              >
                <div className="w-full text-left p-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBulk.has(c.whatsappNumber)}
                    onChange={(e) => {
                      const newSet = new Set(selectedBulk)
                      if (e.target.checked) newSet.add(c.whatsappNumber)
                      else newSet.delete(c.whatsappNumber)
                      setSelectedBulk(newSet)
                    }}
                    className="mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <button
                    onClick={() => openConversation(c.whatsappNumber)}
                    className="w-full text-left flex-1"
                  >
                  <div className="flex gap-2 items-start justify-between">
                    <div className="flex gap-2 items-start min-w-0 flex-1">
                      <Avatar name={c.clientName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{c.clientName ?? c.whatsappNumber}</div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastDirection === 'outbound' ? '↩ ' : ''}{c.lastContent ?? ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {c.unread > 0 && <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{c.unread}</span>}
                      <span className="text-[10px] text-gray-400">{fmtTime(c.lastAt)}</span>
                    </div>
                  </div>
                  {c.waitingHuman && <span className="text-[10px] text-yellow-700 font-medium mt-1 block">⏳ aguardando atendimento</span>}
                  {c.mode === 'human' && <span className="text-[10px] text-green-600 font-medium">🧑‍💼 em atendimento</span>}
                  {isStalled && <span className="text-[10px] text-orange-600 font-medium">⏱️ parada há {minAgo}m</span>}
                </button>
              </div>
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
        </div>

        {/* Conversa - ocupa 2 colunas em lg, 1 em md, e full em mobile */}
        <div className={`${!selected ? 'hidden' : ''} md:col-span-1 lg:col-span-2 border rounded-lg flex flex-col bg-gray-50`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Selecione uma conversa</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-start min-w-0 flex-1">
                    <Avatar name={current?.clientName} size="lg" />
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setSelected(null)}
                        className="md:hidden text-blue-600 text-xs font-medium mb-1"
                      >
                        ← Voltar
                      </button>
                      <div className="text-sm font-bold text-gray-900">{current?.clientName ?? 'Cliente'}</div>
                      <div className="text-xs text-gray-500 font-mono">{selected}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${isHuman ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isHuman ? '🧑‍💼 atendimento humano' : '🤖 bot ativo'}
                      </span>
                    </div>
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
              </div>

              {context && Object.keys(contextToSelections(context)).length > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b">
                  <SelectionsSummary selections={contextToSelections(context)} compact={false} />
                </div>
              )}

              <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} isMine={m.direction === 'outbound'} />
                ))}
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
