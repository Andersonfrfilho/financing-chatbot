import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card } from '@/components/ui'

type DashboardStats = {
  leads: { total: number; byStatus: Record<string, number>; newToday: number; newThisWeek: number }
  clients: { total: number; newToday: number; newThisWeek: number }
  simulations: { total: number; byFinancingType: Record<string, number>; todayTotal: number }
  sessions: { active: number; byState: Record<string, number> }
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', em_atendimento: 'Em atendimento', proposta_enviada: 'Proposta enviada',
  aprovado: 'Aprovado', reprovado: 'Reprovado', cancelado: 'Cancelado', concluido: 'Concluído',
}

const FINANCING_LABELS: Record<string, string> = {
  imobiliario: 'Imóvel', veiculo: 'Veículo', pessoal: 'Pessoal',
  consignado: 'Consignado', empresa: 'Empresa', equipamento: 'Equipamento', rural: 'Rural',
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

export function DashboardPage() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r: any) => r.data),
    refetchInterval: 30_000,
  })

  if (!stats) return <div className="text-gray-400">Carregando...</div>

  const statusChartData = Object.entries(stats.leads.byStatus).map(([k, v]) => ({
    name: STATUS_LABELS[k] ?? k, value: v,
  }))

  const financingChartData = Object.entries(stats.simulations.byFinancingType).map(([k, v]) => ({
    name: FINANCING_LABELS[k] ?? k, value: v,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Geral</h2>
        <p className="text-gray-500 text-sm mt-1">Visão consolidada em tempo real</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads Hoje" value={stats.leads.newToday} sub={`${stats.leads.total} total`} color="blue" />
        <StatCard label="Clientes Ativos" value={stats.clients.total} sub={`+${stats.clients.newToday} hoje`} color="green" />
        <StatCard label="Simulações Hoje" value={stats.simulations.todayTotal} sub={`${stats.simulations.total} total`} color="yellow" />
        <StatCard label="Sessões Ativas" value={stats.sessions.active} sub="bot em atendimento" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Leads por Status</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados ainda</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Simulações por Modalidade</h3>
          {financingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={financingChartData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados ainda</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value.toLocaleString('pt-BR')}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  )
}
