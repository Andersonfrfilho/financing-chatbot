import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePrivacyStore } from '@/store/privacyStore'
import { sessions as text } from '@/locales'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, MessageSquare, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Input, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
import { useSortableData } from '@/hooks/useSortableData'

type Session = {
  id: string
  whatsappNumber: string
  currentState: string
  lastActivity: string
  clientName?: string | null
  context: Record<string, unknown>
}

type StateLabel = { label: string; color: string }

export function SessionsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [state, setState] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { isPrivate } = usePrivacyStore()
  const [visibleSessions, setVisibleSessions] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = debouncedSearch || state || startDate || endDate
  const clearFilters = () => {
    setSearch('')
    setState('')
    setStartDate('')
    setEndDate('')
  }

  const toggleVisible = (id: string) => {
    setVisibleSessions((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const { data: stateLabels } = useQuery<Record<string, StateLabel>>({
    queryKey: ['state-labels'],
    queryFn: () => api.get('/settings/state-labels').then((r: any) => r.data),
    staleTime: 1000 * 60 * 60,
  })

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ['session-stats'],
    queryFn: () => api.get('/sessions/stats').then((r: any) => r.data),
    refetchInterval: 15_000,
  })

  const { data, isLoading } = useQuery<{ data: Session[]; total: number }>({
    queryKey: ['sessions', debouncedSearch, state, startDate, endDate, page, limit],
    queryFn: () => api.get('/sessions', {
      params: {
        search:    debouncedSearch || undefined,
        state:     state || undefined,
        startDate: startDate || undefined,
        endDate:   endDate || undefined,
        page,
        limit,
      }
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const resetSession = useMutation({
    mutationFn: (number: string) => api.delete(`/sessions/${number}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Session>(data?.data, 'lastActivity')

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div><Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-52 mt-2" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border-2 border-transparent bg-gray-100 p-2.5 md:p-3">
            <Skeleton className="h-7 w-8 bg-gray-300/60" />
            <Skeleton className="h-3 w-16 mt-1.5 bg-gray-300/60" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={8} cols={4} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{text.subtitle}</p>
      </div>

      {stats && stateLabels && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {Object.entries(stats).map(([s, count]) => {
            const info = stateLabels[s] ?? { label: s, color: 'bg-gray-100 text-gray-600' }
            const isSelected = state === s
            return (
              <button
                key={s}
                onClick={() => setState(isSelected ? '' : s)}
                className={`rounded-xl p-2.5 md:p-3 cursor-pointer border-2 transition-all text-left ${info.color} ${isSelected ? 'border-current ring-2 ring-offset-1' : 'border-transparent'}`}
              >
                <p className="text-xl md:text-2xl font-bold">{count}</p>
                <p className="text-[10px] md:text-xs mt-0.5 opacity-75 leading-tight">{info.label}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder="Buscar por nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500">
            <X size={14} />
            <span className="ml-1">{text.filters.clearAll}</span>
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Cliente" field="clientName" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="WhatsApp" field="whatsappNumber" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Estado" field="currentState" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Última atividade" field="lastActivity" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((session) => {
              const info = stateLabels?.[session.currentState] ?? { label: session.currentState, color: 'bg-gray-100 text-gray-600' }
              const visible = !isPrivate || visibleSessions.has(session.id)
              return (
                <TableRow key={session.id}>
                  <TableCell className="font-medium text-sm">{session.clientName || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs whitespace-nowrap">
                    {visible ? formatPhone(session.whatsappNumber) : obfuscatePhone(session.whatsappNumber)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] md:text-xs font-semibold whitespace-nowrap ${info.color}`}>
                      {info.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {new Date(session.lastActivity).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleVisible(session.id)}>
                        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button
                        variant={session.currentState === 'human_handoff' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => { window.location.href = `/conversations?whatsapp=${encodeURIComponent(session.whatsappNumber)}` }}
                        title="Ir para conversa"
                        className={session.currentState === 'human_handoff' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                      >
                        <MessageSquare size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm('Resetar sessão?')) resetSession.mutate(session.whatsappNumber) }}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{text.empty}</p>}
      </div>

      {data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Exibir</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>por página</span>
            <span className="ml-2 text-gray-400">
              ({data.total} total)
            </span>
          </div>
          {data.total > limit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} /> Anterior
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Pág. {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>
                Próxima <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
