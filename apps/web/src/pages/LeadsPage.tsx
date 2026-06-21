import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Lead = {
  id: string
  whatsappNumber: string
  status: string
  assignedTo?: string
  notes?: string
  createdAt: string
  clientId: string
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

export function LeadsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data } = useQuery<{ data: Lead[]; total: number }>({
    queryKey: ['leads', status, page],
    queryFn: () =>
      api.get('/leads', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api.patch(`/leads/${id}`, { status: newStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} leads encontrados</p>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['WhatsApp', 'Status', 'Criado em', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((lead) => {
              const statusInfo = STATUS_LABELS[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.whatsappNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus.mutate({ id: lead.id, newStatus: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
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
    </div>
  )
}
