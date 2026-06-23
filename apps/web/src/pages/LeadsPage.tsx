// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
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
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-700' },
  em_atendimento: { label: 'Em atendimento', color: 'bg-yellow-100 text-yellow-700' },
  proposta_enviada: { label: 'Proposta enviada', color: 'bg-purple-100 text-purple-700' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-600' },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
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

  const { data } = useQuery<{ data: Lead[]; total: number }>({
    queryKey: ['leads', search, status, page],
    queryFn: () =>
      api.get('/leads', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } }).then((r: any) => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api.patch(`/leads/${id}`, { status: newStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const updateLead = useMutation({
    mutationFn: ({ id, notes, assignedTo }: { id: string; notes?: string; assignedTo?: string }) =>
      api.patch(`/leads/${id}`, { notes, assignedTo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      setEditingId(null)
    },
  })

  const toggleVisible = (leadId: string) => {
    const newSet = new Set(visibleLeads)
    if (newSet.has(leadId)) newSet.delete(leadId)
    else newSet.add(leadId)
    setVisibleLeads(newSet)
  }

  const isVisible = (leadId: string) => visibleLeads.has(leadId)

  const startEdit = (lead: Lead) => {
    setEditForm({ notes: lead.notes || '', assignedTo: lead.assignedTo || '' })
    setEditingId(lead.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} leads encontrados</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Buscar WhatsApp/Cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-64"
          />
          <Select value={status} onValueChange={(value: string) => { setStatus(value); setPage(1) }}>
            <SelectTrigger className="w-48">
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((lead) => {
              const statusInfo = STATUS_LABELS[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono text-xs">
                    {isVisible(lead.id) ? formatPhone(lead.whatsappNumber) : obfuscatePhone(lead.whatsappNumber)}
                  </TableCell>
                  <TableCell>{lead.clientName || '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value: string) => updateStatus.mutate({ id: lead.id, newStatus: value })}
                    >
                      <SelectTrigger className={`w-32 text-xs ${statusInfo.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{lead.assignedTo ? lead.assignedTo.split('@')[0] : '—'}</TableCell>
                  <TableCell className="text-xs">{getDaysAgo(lead.createdAt)}</TableCell>
                  <TableCell className="text-xs">{lead.updatedAt ? getDaysAgo(lead.updatedAt) : '—'}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisible(lead.id)}
                      title={isVisible(lead.id) ? 'Esconder' : 'Mostrar'}
                    >
                      {isVisible(lead.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(lead)}
                      title="Editar notas"
                    >
                      <Edit2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhum lead encontrado</p>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} />
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">Página {page}</span>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>
            Próxima
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vendedor/Atribuído a</label>
              <Input
                value={editForm.assignedTo}
                onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                placeholder="Nome do vendedor"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Anotações sobre o lead..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editingId) return
                updateLead.mutate({ id: editingId, ...editForm })
              }}
              disabled={updateLead.isPending}
            >
              {updateLead.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
