import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'

type Session = {
  id: string
  whatsappNumber: string
  currentState: string
  lastActivity: string
  context: Record<string, unknown>
}

type StateLabel = { label: string; color: string }

export function SessionsPage() {
  const [state, setState] = useState('')
  const qc = useQueryClient()

  const { data: stateLabels } = useQuery<Record<string, StateLabel>>({
    queryKey: ['state-labels'],
    queryFn: () => api.get('/settings/state-labels').then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ['session-stats'],
    queryFn: () => api.get('/sessions/stats').then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data } = useQuery<{ data: Session[]; total: number }>({
    queryKey: ['sessions', state],
    queryFn: () => api.get('/sessions', { params: { state: state || undefined, limit: 50 } }).then((r) => r.data),
  })

  const resetSession = useMutation({
    mutationFn: (number: string) => api.delete(`/sessions/${number}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sessões do Bot</h2>
        <p className="text-gray-500 text-sm mt-1">Monitoramento em tempo real</p>
      </div>

      {stats && stateLabels && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(stats).map(([s, count]) => {
            const info = stateLabels[s] ?? { label: s, color: 'bg-gray-100 text-gray-600' }
            return (
              <div key={s} className={`rounded-lg p-3 ${info.color} cursor-pointer border-2 ${state === s ? 'border-current' : 'border-transparent'}`} onClick={() => setState(state === s ? '' : s)}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-0.5 opacity-75">{info.label}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['WhatsApp', 'Estado', 'Última atividade', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((session) => {
              const info = stateLabels?.[session.currentState] ?? { label: session.currentState, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{session.whatsappNumber}</td>
                  <td className="px-4 py-3"><span className={`badge ${info.color}`}>{info.label}</span></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(session.lastActivity).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (confirm('Resetar sessão?')) resetSession.mutate(session.whatsappNumber) }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Resetar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhuma sessão ativa</p>
        )}
      </div>
    </div>
  )
}
