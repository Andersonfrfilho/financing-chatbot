import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Eye, EyeOff, Edit2, ChevronLeft, ChevronRight, X, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import { usePrivacyStore } from '@/store/privacyStore'
import { common } from '@/locales'
import { leads as text } from '@/locales'
import { Button, Input, Textarea, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
import { LEAD_STATUSES, FINANCING_LABELS } from '@/lib/constants'
import { useSortableData } from '@/hooks/useSortableData'

type Lead = {
  id: string
  whatsappNumber: string
  status: string
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt?: string
  clientId: string
  clientName?: string
  financingType?: string
  requestedProduct?: string
}

const getProductLabel = (lead: Lead): string => {
  const key = lead.requestedProduct || lead.financingType || ''
  return FINANCING_LABELS[key] ?? (key ? key.replace(/_/g, ' ') : text.noProduct)
}

const PRODUCT_COLOR_CACHE: Record<string, string> = {}
function getProductColor(key: string): string {
  if (PRODUCT_COLOR_CACHE[key]) return PRODUCT_COLOR_CACHE[key]
  const colors = ['bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400', 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400', 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400', 'bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400']
  const hash = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  PRODUCT_COLOR_CACHE[key] = colors[hash % colors.length]
  return PRODUCT_COLOR_CACHE[key]
}

function getLeadMessage(lead: Lead): string {
  const name = lead.clientName?.split(' ')[0] ?? ''
  const product = getProductLabel(lead)
  return text.quickMessage(name, product)
}

const getDaysAgo = (date: string) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `${days}d atrás`
}

export function LeadsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { isPrivate, togglePrivacy } = usePrivacyStore()
  const [visibleLeads, setVisibleLeads] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ notes: '', assignedTo: '' })
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = debouncedSearch || status || assignedTo || startDate || endDate
  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setAssignedTo('')
    setStartDate('')
    setEndDate('')
  }

  const { data, isLoading } = useQuery<{ data: Lead[]; total: number }>({
    queryKey: ['leads', debouncedSearch, status, assignedTo, startDate, endDate, page, limit],
    queryFn: () =>
      api.get('/leads', {
        params: {
          search: debouncedSearch || undefined,
          status: status || undefined,
          assignedTo: assignedTo || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit,
        }
      }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Lead>(data?.data, 'createdAt')

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) => api.patch(`/leads/${id}`, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  })

  const updateLead = useMutation({
    mutationFn: ({ id, notes, assignedTo }: { id: string; notes?: string; assignedTo?: string }) =>
      api.patch(`/leads/${id}`, { notes, assignedTo }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setEditingId(null) },
  })

  const toggleVisible = (id: string) => {
    setVisibleLeads((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const startEdit = (lead: Lead) => {
    setEditForm({ notes: lead.notes || '', assignedTo: lead.assignedTo || '' })
    setEditingId(lead.id)
  }

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><Skeleton className="h-7 w-24" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <div className="flex gap-2"><Skeleton className="h-9 w-48" /><Skeleton className="h-9 w-32" /></div>
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.subtitle(data?.total ?? 0)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-lg">{text.description}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder={text.filters.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={text.filters.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.allStatus}</SelectItem>
            {Object.entries(LEAD_STATUSES).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder={text.filters.assignedTo}
          value={assignedTo}
          onChange={(e) => { setAssignedTo(e.target.value); setPage(1) }}
          className="w-full sm:w-36"
        />
        <Input
          type="datetime-local"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="w-full sm:w-48 text-xs"
        />
        <Input
          type="datetime-local"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="w-full sm:w-48 text-xs"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500">
            <X size={14} />
            <span className="ml-1">{text.filters.clearAll}</span>
          </Button>
        )}
        <Button
          variant={isPrivate ? 'outline' : 'default'}
          size="sm"
          onClick={togglePrivacy}
          className="gap-1.5 text-xs ml-auto"
        >
          {isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPrivate ? common.privacy.showPhoneNumbers : common.privacy.hidePhoneNumbers}
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={text.columns.whatsapp} field="whatsappNumber" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label={text.columns.client} field="clientName" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label={text.columns.product} field="requestedProduct" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <SortableHead label={text.columns.status} field="status" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label={text.columns.seller} field="assignedTo" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortableHead label={text.columns.created} field="createdAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortableHead label={text.columns.updated} field="updatedAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden xl:table-cell" />
              <TableHead>{text.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((lead) => {
              const info = LEAD_STATUSES[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              const visible = visibleLeads.has(lead.id)
              const productKey = lead.requestedProduct || lead.financingType || ''
              const productLabel = getProductLabel(lead)
              const productColor = getProductColor(productKey)
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {(!isPrivate || visible) ? formatPhone(lead.whatsappNumber) : obfuscatePhone(lead.whatsappNumber)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{lead.clientName || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {productKey
                      ? <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${productColor}`}>{productLabel}</span>
                      : <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v: string) => updateStatus.mutate({ id: lead.id, newStatus: v })}
                    >
                      <SelectTrigger className={`w-32 md:w-40 text-xs ${info.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{lead.assignedTo || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{getDaysAgo(lead.createdAt)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-xs">{lead.updatedAt ? getDaysAgo(lead.updatedAt) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleVisible(lead.id)} title={visible ? 'Esconder' : 'Mostrar'}>
                        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const encodedMessage = encodeURIComponent(getLeadMessage(lead))
                          window.location.href = `/conversations?whatsapp=${encodeURIComponent(lead.whatsappNumber)}&message=${encodedMessage}`
                        }}
                        title="WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(lead)} title="Editar">
                        <Edit2 size={14} />
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
            <span>{common.pagination.show}</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>{common.pagination.perPage}</span>
            <span className="ml-2 text-gray-400">
              {common.pagination.total(data.total)}
            </span>
          </div>
          {data.total > limit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} /> {common.pagination.previous}
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">{common.pagination.page(page)}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>
                {common.pagination.next} <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{text.edit.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{text.edit.seller}</label>
              <Input value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} placeholder={text.edit.sellerPlaceholder} />
            </div>
            <div>
              <label className="text-sm font-medium">{text.edit.notes}</label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder={text.edit.notesPlaceholder} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={() => editingId && updateLead.mutate({ id: editingId, ...editForm })} disabled={updateLead.isPending}>
              {updateLead.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
