import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, useMemo } from 'react'
import { LogOut, Paperclip, Power, Search, SendHorizonal, Settings, UserCheck, X, MessageSquare, Clock, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { conversations as text } from '@/locales'
import { useAuthStore } from '@/store/authStore'
import { Button, Skeleton } from '@/components/ui'
import { MessageBubble } from '@/components/MessageBubble'
import { SelectionsSummary } from '@/components/SelectionsSummary'
import { Avatar } from '@/components/Avatar'
import { formatPhone } from '@/lib/phone'

const SSE_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

type ConversationItem = {
  whatsappNumber: string
  lastContent: string | null
  lastDirection: string | null
  lastAt: string
  lastInboundAt: string | null
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

type QuickMessage = { label: string; text: (conversationData: ConversationItem | undefined, selections: Record<string, any>) => string }

function buildQuickMessages(current: ConversationItem | undefined, selections: Record<string, any>): QuickMessage[] {
  const name = current?.clientName?.split(' ')[0] ?? ''
  const product = selections['requestedProduct']?.value ?? ''
  const productLabels = text.productLabels as Record<string, string>

  return [
    { label: text.quickMessages.greeting,   text: () => text.quickMessages.greetingText(name) },
    { label: text.quickMessages.status,     text: () => text.quickMessages.statusText(productLabels[product] ?? '') },
    { label: text.quickMessages.simulation, text: () => text.quickMessages.simulationText() },
    { label: text.quickMessages.documents,  text: () => text.quickMessages.documentsText(productLabels[product] ?? '') },
    { label: text.quickMessages.contact,    text: () => text.quickMessages.contactText() },
    { label: text.quickMessages.deadline,   text: () => text.quickMessages.deadlineText() },
  ]
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getMinutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60))
}

function getHoursAgo(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

function formatStalledDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remaining > 0) return `${days}d ${remainingHours}h:${String(remaining).padStart(2, '0')}m`
    if (remainingHours > 0) return `${days}d ${remainingHours}h`
    return `${days}d`
  }
  return remaining > 0 ? `${hours}h:${String(remaining).padStart(2, '0')}m` : `${hours}h`
}

const WINDOW_STATUS = {
  ACTIVE:      'active',
  APPROACHING: 'approaching',
  WARNING:     'warning',
  EXPIRED:     'expired',
} as const
type WindowStatus = (typeof WINDOW_STATUS)[keyof typeof WINDOW_STATUS]

const WINDOW_FILTER_ALL = 'all' as const

function getWindowStatus(hours: number | null): WindowStatus {
  if (hours === null) return WINDOW_STATUS.ACTIVE
  if (hours >= 24) return WINDOW_STATUS.EXPIRED
  if (hours >= 21) return WINDOW_STATUS.WARNING
  if (hours >= 12) return WINDOW_STATUS.APPROACHING
  return WINDOW_STATUS.ACTIVE
}

const WINDOW_BORDER: Record<WindowStatus, string> = {
  [WINDOW_STATUS.ACTIVE]:      'border-l-4 border-l-green-400 dark:border-l-green-500 animate-status-pulse',
  [WINDOW_STATUS.APPROACHING]: 'border-l-4 border-l-yellow-400 dark:border-l-yellow-600 animate-status-pulse-attention',
  [WINDOW_STATUS.WARNING]:     'border-l-4 border-l-red-500 dark:border-l-red-500 animate-status-pulse-intense',
  [WINDOW_STATUS.EXPIRED]:     'border-l-4 border-l-gray-300 dark:border-l-gray-600',
}

const HIDDEN_FIELDS = new Set(['flow', 'step'])

const MONEY_FIELDS = new Set([
  'valorImovel', 'rendaFamiliar', 'valorTerreno', 'valorConstrucao',
  'valorCarta', 'valorDesejado', 'valorCredito', 'rendaMensal', 'downPayment', 'totalAmount',
])

const CTX_ORDER = [
  'requestedProduct', 'name', 'cpf', 'nascimento', 'cidade',
  'valorImovel', 'imovelCond', 'rendaFamiliar', 'rendaMensal',
  'fgts3anos', 'dependentes', 'jaTemImovel',
  'construcaoTipo', 'valorTerreno', 'valorConstrucao',
  'consorcioPara', 'valorCarta',
  'consignadoTipo', 'valorDesejado', 'consignadoAtivo', 'imovelQuitado', 'valorCredito',
  // legacy
  'email', 'phone', 'state', 'city', 'birthDate', 'personType', 'civilStatus',
  'vehicleType', 'vehicleBrand', 'vehicleModel', 'habitationType', 'financingType',
  'downPayment', 'installments', 'totalAmount',
]

function fmtMoney(value: string): string {
  const num = parseFloat(String(value).replace(/[^\d.]/g, ''))
  if (isNaN(num)) return value
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtValue(key: string, value: string): string {
  if (MONEY_FIELDS.has(key)) return fmtMoney(value)
  const lower = value.toLowerCase().trim()
  const choices = text.choices as Record<string, string>
  if (choices[lower]) return choices[lower]
  return value
}

function contextToSelections(contextData: Record<string, unknown> | null): Record<string, any> {
  if (!contextData) return {}

  const selections: Record<string, any> = {}
  Object.entries(contextData).forEach(([key, rawValue]) => {
    if (HIDDEN_FIELDS.has(key)) return
    const stringValue = rawValue != null && rawValue !== '' ? String(rawValue) : ''
    if (!stringValue) return
    selections[key] = {
      step: key,
      label: (text.contextLabels as Record<string, string>)[key] || key,
      value: fmtValue(key, stringValue),
      selectedAt: new Date().toISOString(),
      status: 'completed' as const,
      order: CTX_ORDER.indexOf(key) >= 0 ? CTX_ORDER.indexOf(key) : 999,
    }
  })

  return selections
}

type AttachedFile = { file: File; base64: string; mimeType: string; preview?: string }

type SendErrors = { windowExpired: string; configMissing: string; networkError: string; sendError: string }

function SendErrorMessage({ error, errors, fallback }: { error: unknown; errors: SendErrors; fallback: string }) {
  const errorCode = (error as any)?.response?.data?.error as string | undefined
  const messages: Record<string, string> = {
    WHATSAPP_WINDOW_EXPIRED: errors.windowExpired,
    WHATSAPP_CONFIG_MISSING: errors.configMissing,
    WHATSAPP_NETWORK_ERROR:  errors.networkError,
    WHATSAPP_SEND_ERROR:     errors.sendError,
  }
  const isWindow = errorCode === 'WHATSAPP_WINDOW_EXPIRED'
  return (
    <div className={`mt-1 rounded-lg px-3 py-2 text-xs ${isWindow ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-red-500'}`}>
      {isWindow && <span className="font-semibold block mb-0.5">⏰ Janela de 24h expirada</span>}
      {messages[errorCode ?? ''] ?? fallback}
    </div>
  )
}

export function ConversationsPage() {
  const deepLinkNumber = new URLSearchParams(window.location.search).get('whatsapp')
  const deepLinkMessage = new URLSearchParams(window.location.search).get('message')
  const [selected, setSelected] = useState<string | null>(deepLinkNumber)
  const [message, setMessage] = useState(deepLinkMessage ? decodeURIComponent(deepLinkMessage) : '')
  const [attached, setAttached] = useState<AttachedFile | null>(null)
  const [waitingOnly, setWaitingOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set())
  const [windowFilter, setWindowFilter] = useState<WindowStatus | typeof WINDOW_FILTER_ALL>(WINDOW_FILTER_ALL)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const { data: list, isLoading: listLoading } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['conversations', waitingOnly],
    queryFn: () => api.get('/conversations', { params: { limit: 50, waitingHuman: waitingOnly ? 'true' : undefined } }).then((r: any) => r.data),
  })

  const { data: templatesData } = useQuery<{ templates: Array<{ name: string; language: string; category: string; status: string }> }>({
    queryKey: ['whatsapp-templates'],
    queryFn: () => api.get('/settings/whatsapp/templates').then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const templates = templatesData?.templates ?? []

  const markRead = useMutation({
    mutationFn: (n: string) => api.post(`/conversations/${encodeURIComponent(n)}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const openConversation = (n: string) => {
    setSelected(n)
    setBefore(null)
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
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['conversation', selected] })
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
    mutationFn: async () => {
      try {
        await api.post(`/conversations/${encodeURIComponent(selected!)}/send`, { text: text.chat.farewell })
      } catch {
        // ignora erro de envio (ex: janela expirada) e finaliza de qualquer forma
      }
      return api.post(`/conversations/${encodeURIComponent(selected!)}/finalize`)
    },
    onSuccess: () => {
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
  const send = useMutation({
    mutationFn: (body: string) => api.post(`/conversations/${encodeURIComponent(selected!)}/send`, { text: body }),
    onSuccess: () => { setMessage(''); refresh() },
  })

  const sendMedia = useMutation({
    mutationFn: (f: AttachedFile) => api.post(`/conversations/${encodeURIComponent(selected!)}/send-media`, {
      base64: f.base64,
      mimeType: f.mimeType,
      filename: f.file.name,
      caption: message.trim(),
    }),
    onSuccess: () => { setMessage(''); setAttached(null); refresh() },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      const mimeType = file.type || 'application/octet-stream'
      const preview = mimeType.startsWith('image/') ? dataUrl : undefined
      setAttached({ file, base64, mimeType, preview })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const sendTemplate = useMutation({
    mutationFn: ({ whatsapp, clientName }: { whatsapp: string; clientName: string | null }) =>
      api.post(`/conversations/${encodeURIComponent(whatsapp)}/send-template`, { clientName }),
    onSuccess: () => refresh(),
  })

  const bulkSendTemplate = useMutation({
    mutationFn: async (templateName?: string) => {
      const expired = conversations.filter((c) => selectedBulk.has(c.whatsappNumber) && getWindowStatus(getHoursAgo(c.lastInboundAt)) === WINDOW_STATUS.EXPIRED)
      for (const c of expired) {
        await api.post(`/conversations/${encodeURIComponent(c.whatsappNumber)}/send-template`, { clientName: c.clientName, templateName }).catch(() => {})
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedBulk(new Set())
      setShowTemplateModal(false)
      setSelectedTemplate('')
    },
  })

  const continueConversation = useMutation({
    mutationFn: (whatsapp: string) => {
      const conv = conversations.find((c) => c.whatsappNumber === whatsapp)
      const reminders = text.reminders as Record<string, string>
      const reminderMsg = reminders[conv?.currentState ?? 'default'] || reminders.default
      return api.post(`/conversations/${encodeURIComponent(whatsapp)}/send`, { text: reminderMsg })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
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
    const eventSource = new EventSource(`${SSE_BASE}/conversations/${encodeURIComponent(selected)}/stream?token=${encodeURIComponent(token)}`)
    eventSource.addEventListener('message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selected] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })
    // Atualizar quando mensagem é lida (readAt recebido)
    eventSource.addEventListener('message-read', () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selected] })
    })
    return () => eventSource.close()
  }, [selected, queryClient])

  const conversations = list?.conversations ?? []
  const messages = history?.messages ?? []
  const current = conversations.find((c) => c.whatsappNumber === selected)
  const isHuman = current?.mode === 'human'
  const waitingCount = conversations.filter((c) => c.waitingHuman).length
  const selectedHours = getHoursAgo(current?.lastInboundAt ?? null)
  const windowExpired = selectedHours !== null && selectedHours >= 24
  const selections = contextToSelections(context ?? null)
  const quickMessages = buildQuickMessages(current, selections)

  const filteredConversations = useMemo(() => {
    let result = conversations
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => {
        const name = (c.clientName || c.whatsappNumber).toLowerCase()
        const content = (c.lastContent || '').toLowerCase()
        return name.includes(q) || content.includes(q) || c.whatsappNumber.includes(q)
      })
    }
    if (windowFilter !== WINDOW_FILTER_ALL) {
      result = result.filter((c) => getWindowStatus(getHoursAgo(c.lastInboundAt)) === windowFilter)
    }
    return result
  }, [conversations, search, windowFilter])

  // Mantém a conversa aberta como lida ao chegar mensagem nova (polling)
  useEffect(() => {
    if (selected && (history?.messages?.length ?? 0) > 0) markRead.mutate(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history?.messages?.length])

  const submit = () => {
    if (attached && !sendMedia.isPending) { sendMedia.mutate(attached); return }
    const body = message.trim()
    if (body && !send.isPending) send.mutate(body)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates
    const q = templateSearch.toLowerCase()
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, templateSearch])

  const expiredSelectedCount = useMemo(
    () => conversations.filter((c) => selectedBulk.has(c.whatsappNumber) && getWindowStatus(getHoursAgo(c.lastInboundAt)) === WINDOW_STATUS.EXPIRED).length,
    [conversations, selectedBulk],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MessageSquare size={14} />
              {text.stats.conversations(conversations.length)}
            </span>
            {waitingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-500">
                <Clock size={14} />
                {text.stats.waiting(waitingCount)}
              </span>
            )}
            {totalUnread > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                <Users size={14} />
                {text.stats.unread(totalUnread)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={waitingOnly ? 'default' : 'outline'}
            onClick={() => setWaitingOnly((v) => !v)}
          >
            {waitingCount > 0 ? text.filters.waitingWithCount(waitingCount) : text.filters.waitingHuman}
          </Button>
          {totalUnread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await api.post('/conversations/read-all').catch(() => {})
                queryClient.invalidateQueries({ queryKey: ['conversations'] })
                window.dispatchEvent(new Event('read-all'))
              }}
            >
              {text.window.markAllRead}
            </Button>
          )}
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{text.window.templateModal.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {text.window.templateModal.availableCount(templates.length)}
                </p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={text.window.templateModal.searchPlaceholder}
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTemplates.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{text.window.templateModal.empty}</p>
              )}
              {filteredTemplates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTemplate(t.name === selectedTemplate ? '' : t.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    t.name === selectedTemplate
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-transparent'
                  }`}
                >
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    <span>{t.language}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="capitalize">{t.category?.toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTemplateModal(false)}>
                {text.window.templateModal.cancel}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (expiredSelectedCount === 0) { alert(text.window.noExpiredSelected); return }
                  bulkSendTemplate.mutate(selectedTemplate || undefined)
                }}
                disabled={bulkSendTemplate.isPending}
              >
                {bulkSendTemplate.isPending ? text.window.bulkTemplateSending : text.window.templateModal.sendCount(expiredSelectedCount)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Lista - oculta em mobile quando conversa selecionada */}
        <div className={`border dark:border-gray-700 rounded-lg flex flex-col bg-white dark:bg-gray-800 overflow-hidden ${selected ? 'hidden md:flex' : ''}`}>
          {/* Ações em massa */}
          {selectedBulk.size > 0 && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex-shrink-0">{text.bulk.selected(selectedBulk.size)}</span>
                {selectedTemplate && (
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full truncate hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    <span className="truncate">{text.window.templateModal.selectedChip(selectedTemplate)}</span>
                    <X
                      size={12}
                      className="flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); setSelectedTemplate('') }}
                    />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedBulk(new Set())}
                  className="text-xs"
                >
                  {text.bulk.clear}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs"
                >
                  {text.window.bulkTemplate}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(text.bulk.confirmFinalize(selectedBulk.size))) {
                      for (const whatsapp of selectedBulk) {
                        api.post(`/conversations/${encodeURIComponent(whatsapp)}/finalize`).catch(() => {})
                      }
                      queryClient.invalidateQueries({ queryKey: ['conversations'] })
                      setSelectedBulk(new Set())
                    }
                  }}
                  className="text-xs"
                >
                  {text.bulk.finalize}
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={text.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Legenda da janela de 24h */}
          {conversations.length > 0 && (
            <div className="px-3 py-1.5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
              <span className="font-medium">{text.window.legend}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWindowFilter(WINDOW_FILTER_ALL)}
                  className={`px-1.5 py-0.5 rounded ${windowFilter === WINDOW_FILTER_ALL ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100' : ''}`}
                >
                  {text.window.all}
                </button>
                {(Object.values(WINDOW_STATUS)).map((status) => (
                  <button
                    key={status}
                    onClick={() => setWindowFilter(windowFilter === status ? WINDOW_FILTER_ALL : status)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${windowFilter === status ? 'ring-1 ring-offset-0' : ''}`}
                    title={text.window[status]}
                  >
                    <span className={`w-2 h-2 rounded-sm ${
                      status === WINDOW_STATUS.ACTIVE ? 'bg-green-400 dark:bg-green-600' :
                      status === WINDOW_STATUS.APPROACHING ? 'bg-yellow-400 dark:bg-yellow-500' :
                      status === WINDOW_STATUS.WARNING ? 'bg-red-500' :
                      'bg-gray-300 dark:bg-gray-600'
                    } flex-shrink-0`} />
                    {text.window.durationAbbr[status]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversas */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            {listLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b p-3 flex items-start gap-2">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
            {!listLoading && filteredConversations.length === 0 && conversations.length === 0 && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">{text.empty}</p>}
            {filteredConversations.length === 0 && conversations.length > 0 && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">{text.emptySearch}</p>}
            {filteredConversations.map((c) => {
            const minAgo = getMinutesAgo(c.lastAt)
            const hoursSinceInbound = getHoursAgo(c.lastInboundAt)
            const minSinceInbound = hoursSinceInbound !== null ? Math.floor(hoursSinceInbound * 60) : null
            const windowStatus = getWindowStatus(hoursSinceInbound)
            const isStalled = c.mode === 'bot' && (minSinceInbound !== null ? minSinceInbound > 30 : minAgo > 30)
            const stalledMinutes = minSinceInbound ?? minAgo
            const borderClass = c.waitingHuman && (windowStatus === WINDOW_STATUS.ACTIVE || windowStatus === WINDOW_STATUS.APPROACHING)
              ? 'border-l-4 border-l-yellow-400 animate-status-pulse-attention'
              : WINDOW_BORDER[windowStatus]
            return (
              <div
                key={c.whatsappNumber}
                className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selected === c.whatsappNumber ? 'bg-blue-50 dark:bg-blue-950/60' : selectedBulk.has(c.whatsappNumber) ? 'bg-blue-100 dark:bg-blue-950/80' : ''} ${borderClass}`}
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
                    className="text-left flex-1 min-w-0"
                  >
                  <div className="flex gap-2 items-start justify-between min-w-0">
                    <div className="flex gap-2 items-start min-w-0 flex-1">
                      <Avatar name={c.clientName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.clientName ?? c.whatsappNumber}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.lastDirection === 'outbound' ? '↩ ' : ''}{c.lastContent ?? ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {c.unread > 0 && <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{c.unread}</span>}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtTime(c.lastAt)}</span>
                    </div>
                  </div>
                  {c.waitingHuman && <span className="text-[10px] text-yellow-700 font-medium mt-1 block">{text.chat.waitingHuman}</span>}
                  {c.mode === 'human' && <span className="text-[10px] text-green-600 font-medium">{text.chat.humanMode}</span>}
                  {isStalled && <span className="text-[10px] text-orange-600 font-medium">{text.chat.stalledFor(formatStalledDuration(stalledMinutes))}</span>}
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
                    {continueConversation.isPending ? '...' : text.chat.continueAttendance}
                  </Button>
                </div>
              )}
            </div>
            )
          })}
            </div>
        </div>

        {/* Conversa - ocupa 2 colunas em lg, 1 em md, e full em mobile */}
        <div className={`${!selected ? 'hidden' : ''} md:col-span-1 lg:col-span-2 border dark:border-gray-700 rounded-lg flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{text.noSelection}</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-start min-w-0 flex-1">
                    <Avatar name={current?.clientName} size="lg" />
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setSelected(null)}
                        className="md:hidden text-blue-600 dark:text-blue-400 text-xs font-medium mb-1"
                      >
                        {text.chat.backToList}
                      </button>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{current?.clientName ?? 'Cliente'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{selected ? formatPhone(selected) : ''}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${isHuman ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {isHuman ? text.chat.humanAttending : text.chat.botActive}
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
                        {text.chat.release}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => takeover.mutate()}
                        disabled={takeover.isPending}
                      >
                        <Power size={14} />
                        <UserCheck size={14} />
                        {text.chat.takeover}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => finalize.mutate()}
                      disabled={finalize.isPending}
                    >
                      {text.chat.finalize}
                    </Button>
                  </div>
                </div>
              </div>

              {context && Object.keys(contextToSelections(context)).length > 0 && (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b dark:border-gray-700 max-h-64 overflow-y-auto flex-shrink-0 scrollbar-thin">
                  <SelectionsSummary selections={contextToSelections(context)} compact={false} />
                </div>
              )}

              <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 scrollbar-thin">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} isMine={m.direction === 'outbound'} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input moderno */}
              <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 flex-shrink-0">
                {/* Template message button para conversas expiradas */}
                {windowExpired ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <span className="font-semibold block mb-0.5">{text.window.expiredBanner}</span>
                      {sendTemplate.isSuccess && text.window.templateSent}
                      {!sendTemplate.isSuccess && !sendTemplate.isError && text.window.templateHint}
                      {sendTemplate.isError && (() => {
                        const errorCode = (sendTemplate.error as any)?.response?.data?.error
                        return errorCode === 'WHATSAPP_TEMPLATE_NOT_CONFIGURED'
                          ? (
                            <span>
                              {text.window.templateNotConfigured}{' '}
                              <Link
                                to="/settings"
                                className="inline-flex items-center gap-0.5 underline font-semibold hover:text-amber-900 dark:hover:text-amber-200"
                              >
                                <Settings size={10} />
                                {text.window.goToSettings}
                              </Link>
                            </span>
                          )
                          : text.window.templateError
                      })()}
                    </div>
                    {!sendTemplate.isSuccess && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => sendTemplate.mutate({ whatsapp: selected!, clientName: current?.clientName ?? null })}
                        disabled={sendTemplate.isPending}
                      >
                        {sendTemplate.isPending ? text.window.templateSending : text.window.sendTemplate}
                      </Button>
                    )}
                  </div>
                ) : !isHuman ? (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 text-center">
                    {text.chat.takeoverRequired}
                  </div>
                ) : (
                  <>
                    {/* Preview do arquivo anexado */}
                    {attached && (
                      <div className="mb-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                        {attached.preview
                          ? <img src={attached.preview} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          : <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 text-lg">📎</div>
                        }
                        <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{attached.file.name}</span>
                        <button onClick={() => setAttached(null)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {/* Quick messages contextuais */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {quickMessages.map((qm) => (
                        <button
                          key={qm.label}
                          type="button"
                          onClick={() => { setMessage(qm.text(current, selections)); textareaRef.current?.focus() }}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors whitespace-nowrap"
                        >
                          {qm.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-end gap-2">
                      {/* Anexar arquivo */}
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title={text.chat.attach}
                      >
                        <Paperclip size={18} />
                      </button>

                      {/* Textarea auto-resize */}
                      <textarea
                        ref={textareaRef}
                        value={message}
                        rows={1}
                        onChange={(e) => {
                          setMessage(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                        placeholder={attached ? text.chat.messagePlaceholder.caption : text.chat.messagePlaceholder.human}
                        className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all overflow-hidden"
                        style={{ minHeight: '36px', maxHeight: '120px' }}
                      />

                      {/* Botão enviar */}
                      <button
                        onClick={submit}
                        disabled={(send.isPending || sendMedia.isPending) || (!message.trim() && !attached)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={text.chat.send}
                      >
                        {(send.isPending || sendMedia.isPending)
                          ? <span className="text-xs">⏳</span>
                          : <SendHorizonal size={16} />
                        }
                      </button>
                    </div>
                    {(send.isError || sendMedia.isError) && (
                      <SendErrorMessage error={send.error ?? sendMedia.error} errors={text.chat.errors} fallback={text.chat.sendError} />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
