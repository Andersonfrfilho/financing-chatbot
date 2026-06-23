import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'
import { Eye, EyeOff, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'

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
    queryFn: () => api.get('/settings/state-labels').then((r: any) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ['session-stats'],
    queryFn: () => api.get('/sessions/stats').then((r: any) => r.data),
    refetchInterval: 15_000,
  })

  const { data } = useQuery<{ data: Session[]; total: number }>({
    queryKey: ['sessions', state],
    queryFn: () => api.get('/sessions', { params: { state: state || undefined, limit: 50 } }).then((r: any) => r.data),
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
            const isSelected = state === s
            return (
              <button
                key={s}
                onClick={() => setState(isSelected ? '' : s)}
                className={`rounded-lg p-3 cursor-pointer border-2 transition-all ${
                  info.color
                } ${isSelected ? 'border-current ring-2 ring-offset-2' : 'border-transparent'}`}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-0.5 opacity-75">{info.label}</p>
              </button>
            )
          })}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((session) => {
              const info = stateLabels?.[session.currentState] ?? { label: session.currentState, color: 'bg-gray-100 text-gray-600' }
              return (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.clientName || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {isVisible(session.id) ? formatPhone(session.whatsappNumber) : obfuscatePhone(session.whatsappNumber)}
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.color}`}>
                      {info.label}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(session.lastActivity).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisible(session.id)}
                      title={isVisible(session.id) ? 'Esconder' : 'Mostrar'}
                    >
                      {isVisible(session.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button
                      variant={session.currentState === 'human_handoff' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => { window.location.href = `/conversations?whatsapp=${encodeURIComponent(session.whatsappNumber)}` }}
                      title="Ir para conversa"
                      className={session.currentState === 'human_handoff' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                    >
                      <MessageSquare size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { if (confirm('Resetar sessão?')) resetSession.mutate(session.whatsappNumber) }}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhuma sessão ativa</p>
        )}
      </div>
    </div>
  )
}
