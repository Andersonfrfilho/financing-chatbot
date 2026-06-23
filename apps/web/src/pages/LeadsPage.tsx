import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { leads as text } from '@/locales'
import { Button, Input, Textarea, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
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
  return (text.products as Record<string, string>)[key] ?? (key ? key.replace(/_/g, ' ') : text.noProduct)
}

const PRODUCT_COLORS: Record<string, string> = {
  imobiliario: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  imovel:      'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  veiculo:     'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  carro:       'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  moto:        'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  caminhao:    'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  pessoal:     'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  consignado:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
  consorcio:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  empresa:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  equipamento: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  rural:       'bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:           { label: text.status.new,           color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  qualified:     { label: text.status.qualified,     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400' },
  disqualified:  { label: text.status.disqualified,  color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  negotiating:   { label: text.status.negotiating,   color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' },
  proposal_sent: { label: text.status.proposal_sent, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  won:           { label: text.status.won,           color: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' },
  lost:          { label: text.status.lost,          color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

const getDaysAgo = (date: string) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `${days}d atrás`
}

export function LeadsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [visibleLeads, setVisibleLeads] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ notes: '', assignedTo: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ data: Lead[]; total: number }>({
    queryKey: ['leads', search, status, page],
    queryFn: () =>
      api.get('/leads', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } }).then((r: any) => r.data),
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Lead>(data?.data, 'createdAt')

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) => api.patch(`/leads/${id}`, { status: newStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const updateLead = useMutation({
    mutationFn: ({ id, notes, assignedTo }: { id: string; notes?: string; assignedTo?: string }) =>
      api.patch(`/leads/${id}`, { notes, assignedTo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setEditingId(null) },
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
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Input
            type="search"
            placeholder={text.search}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full sm:w-56"
          />
          <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={text.allStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{text.allStatus}</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              const info = STATUS_LABELS[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              const visible = visibleLeads.has(lead.id)
              const productKey = lead.requestedProduct || lead.financingType || ''
              const productLabel = getProductLabel(lead)
              const productColor = PRODUCT_COLORS[productKey] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {visible ? formatPhone(lead.whatsappNumber) : obfuscatePhone(lead.whatsappNumber)}
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
                        {Object.entries(STATUS_LABELS).map(([key, value]) => (
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

      {data && data.total > 20 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} /> Anterior
          </Button>
          <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Pág. {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>
            Próxima <ChevronRight size={16} />
          </Button>
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
