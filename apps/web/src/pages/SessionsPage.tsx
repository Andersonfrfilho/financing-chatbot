import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Session = {
  id: string
  whatsappNumber: string
  currentState: string
  lastActivity: string
  context: Record<string, unknown>
}

type StateLabel = { label: string; color: string }

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '').slice(-11)
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
}

const obfuscatePhone = (phone: string) => {
  const formatted = formatPhone(phone)
  return formatted.replace(/\d{4}$/, '****')
}

export function SessionsPage() {
  const [state, setState] = useState('')
  const [visibleSessions, setVisibleSessions] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const toggleVisible = (sessionId: string) => {
    const newSet = new Set(visibleSessions)
    if (newSet.has(sessionId)) newSet.delete(sessionId)
    else newSet.add(sessionId)
    setVisibleSessions(newSet)
  }

  const isVisible = (sessionId: string) => visibleSessions.has(sessionId)

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
                  <td className="px-4 py-3 font-mono text-xs">
                    {isVisible(session.id) ? formatPhone(session.whatsappNumber) : obfuscatePhone(session.whatsappNumber)}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${info.color}`}>{info.label}</span></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(session.lastActivity).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => toggleVisible(session.id)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                      title={isVisible(session.id) ? 'Esconder' : 'Mostrar'}
                    >
                      {isVisible(session.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => { if (confirm('Resetar sessão?')) resetSession.mutate(session.whatsappNumber) }}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      🗑️
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
