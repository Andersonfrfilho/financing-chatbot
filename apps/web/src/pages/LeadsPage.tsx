// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { leads as text, common } from '@/locales'
import { Button, Input, Textarea, Skeleton, TableSkeleton } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'

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
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  novo:             { label: text.status.novo,             color: 'bg-blue-100 text-blue-700' },
  em_atendimento:   { label: text.status.em_atendimento,   color: 'bg-yellow-100 text-yellow-700' },
  proposta_enviada: { label: text.status.proposta_enviada, color: 'bg-purple-100 text-purple-700' },
  aprovado:         { label: text.status.aprovado,         color: 'bg-green-100 text-green-700' },
  reprovado:        { label: text.status.reprovado,        color: 'bg-red-100 text-red-700' },
  cancelado:        { label: text.status.cancelado,        color: 'bg-gray-100 text-gray-600' },
  concluido:        { label: text.status.concluido,        color: 'bg-emerald-100 text-emerald-700' },
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.subtitle(data?.total ?? 0)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="search"
            placeholder="Buscar WhatsApp/Cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full sm:w-56"
          />
          <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
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
              <TableHead>WhatsApp</TableHead>
              <TableHead className="hidden sm:table-cell">Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Vendedor</TableHead>
              <TableHead className="hidden md:table-cell">Criado</TableHead>
              <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((lead) => {
              const info = STATUS_LABELS[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              const visible = visibleLeads.has(lead.id)
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {visible ? formatPhone(lead.whatsappNumber) : obfuscatePhone(lead.whatsappNumber)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{lead.clientName || '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v: string) => updateStatus.mutate({ id: lead.id, newStatus: v })}
                    >
                      <SelectTrigger className={`w-28 md:w-36 text-xs ${info.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{lead.assignedTo ? lead.assignedTo.split('@')[0] : '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{getDaysAgo(lead.createdAt)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{lead.updatedAt ? getDaysAgo(lead.updatedAt) : '—'}</TableCell>
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
          <span className="px-3 py-1.5 text-sm text-gray-600">Pág. {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>
            Próxima <ChevronRight size={16} />
          </Button>
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vendedor / Atribuído a</label>
              <Input value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })} placeholder="Nome do vendedor" />
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Anotações sobre o lead..." rows={4} />
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
