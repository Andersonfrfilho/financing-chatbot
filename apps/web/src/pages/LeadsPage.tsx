import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

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

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '').slice(-11)
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
}

const obfuscatePhone = (phone: string) => {
  const formatted = formatPhone(phone)
  return formatted.replace(/\d{4}$/, '****')
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
      api.get('/leads', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } }).then((r) => r.data),
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
          <input
            type="search"
            placeholder="Buscar WhatsApp/Cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['WhatsApp', 'Cliente', 'Status', 'Vendedor', 'Criado', 'Atualizado', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((lead) => {
              const statusInfo = STATUS_LABELS[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {isVisible(lead.id) ? formatPhone(lead.whatsappNumber) : obfuscatePhone(lead.whatsappNumber)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{lead.clientName || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus.mutate({ id: lead.id, newStatus: e.target.value })}
                      className={`border border-gray-200 rounded px-2 py-1 text-xs font-medium ${statusInfo.color} cursor-pointer`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{lead.assignedTo ? lead.assignedTo.split('@')[0] : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{getDaysAgo(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.updatedAt ? getDaysAgo(lead.updatedAt) : '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => toggleVisible(lead.id)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                      title={isVisible(lead.id) ? 'Esconder' : 'Mostrar'}
                    >
                      {isVisible(lead.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => startEdit(lead)}
                      className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      title="Editar notas"
                    >
                      📝
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhum lead encontrado</p>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
          <span className="px-4 py-2 text-sm text-gray-600">Página {page}</span>
          <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>Próxima</button>
        </div>
      )}

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Editar Lead</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Vendedor/Atribuído a</label>
                <input
                  type="text"
                  value={editForm.assignedTo}
                  onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                  placeholder="Nome do vendedor"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Anotações sobre o lead..."
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!editingId) return
                  updateLead.mutate({ id: editingId, ...editForm })
                }}
                disabled={updateLead.isPending}
                className="flex-1 px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {updateLead.isPending ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
