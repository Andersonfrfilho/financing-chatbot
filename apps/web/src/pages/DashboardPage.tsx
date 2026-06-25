import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, Skeleton } from '@/components/ui'
import { dashboard, common } from '@/locales'
import { LEAD_STATUSES, FINANCING_LABELS } from '@/lib/constants'

type DashboardStats = {
  leads: { total: number; byStatus: Record<string, number>; newToday: number; newThisWeek: number }
  clients: { total: number; newToday: number; newThisWeek: number }
  simulations: { total: number; byFinancingType: Record<string, number>; todayTotal: number }
  sessions: { active: number; byState: Record<string, number> }
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const STATE_LABELS: Record<string, string> = {
  greeting: 'Boas-vindas',
  awaiting_financing_type: 'Tipo financiamento',
  awaiting_name: 'Nome',
  awaiting_cpf: 'CPF',
  awaiting_birth_date: 'Nascimento',
  awaiting_civil_status: 'Estado civil',
  awaiting_email: 'E-mail',
  awaiting_city: 'Cidade',
  awaiting_state: 'Estado',
  awaiting_monthly_income: 'Renda',
  awaiting_family_income: 'Renda familiar',
  awaiting_fgts: 'FGTS',
  awaiting_down_payment: 'Entrada',
  awaiting_property_value: 'Valor imóvel',
  awaiting_property_type: 'Tipo imóvel',
  awaiting_vehicle_type: 'Tipo veículo',
  awaiting_vehicle_value: 'Valor veículo',
  awaiting_vehicle_year: 'Ano veículo',
  awaiting_loan_amount: 'Valor empréstimo',
  awaiting_term: 'Prazo',
  simulation_ready: 'Simulação pronta',
  human_handoff: 'Aguardando humano',
  completed: 'Concluído',
  abandoned: 'Abandonado',
  in_flow: 'Em fluxo',
  awaiting_menu: 'Aguardando menu',
  new: 'Novo',
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {['bg-blue-50 dark:bg-blue-950/30', 'bg-green-50 dark:bg-green-950/30', 'bg-yellow-50 dark:bg-yellow-950/30', 'bg-purple-50 dark:bg-purple-950/30'].map((bg, i) => (
          <div key={i} className={`rounded-xl border dark:border-gray-700 p-3 md:p-4 ${bg}`}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-16 mt-2" />
            <Skeleton className="h-3 w-20 mt-1.5" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="flex items-center justify-center h-[180px]">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r: any) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading || !stats) return <DashboardSkeleton />

  const statusChartData = Object.entries(stats.leads.byStatus).map(([k, v]) => ({
    name: LEAD_STATUSES[k]?.label ?? k, value: v,
  }))

  const sessionsChartData = Object.entries(stats.sessions.byState)
    .map(([k, v]) => ({ name: STATE_LABELS[k] ?? k.replace(/_/g, ' '), value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const financingChartData = Object.entries(stats.simulations.byFinancingType).map(([k, v]) => ({
    name: FINANCING_LABELS[k] ?? k, value: v,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboard.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={dashboard.stats.leadsToday}       value={stats.leads.newToday}        sub={dashboard.stats.total(stats.leads.total)}            color="blue"   />
        <StatCard label={dashboard.stats.activeClients}   value={stats.clients.total}          sub={dashboard.stats.newToday(stats.clients.newToday)}    color="green"  />
        <StatCard label={dashboard.stats.simulationsToday}value={stats.simulations.todayTotal} sub={dashboard.stats.total(stats.simulations.total)}      color="yellow" />
        <StatCard label={dashboard.stats.activeSessions}  value={stats.sessions.active}        sub={dashboard.stats.botAttendance}                       color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm md:text-base">{dashboard.charts.leadsByStatus}</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label>
                  {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">{common.empty.noData}</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm md:text-base">{dashboard.charts.sessionsByState}</h3>
          {sessionsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sessionsChartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">{common.empty.noData}</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm md:text-base">{dashboard.charts.simulationsByModality}</h3>
          {financingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={financingChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">{common.empty.noData}</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm md:text-base">{dashboard.charts.weekly}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.leads.newThisWeek}</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Leads esta semana</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.clients.newThisWeek}</p>
              <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">Clientes novos</p>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.simulations.todayTotal}</p>
              <p className="text-[11px] text-yellow-600 dark:text-yellow-400 mt-0.5">Simulações hoje</p>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.sessions.active}</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">Sessões ativas</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    green:  'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900',
    purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900',
  }
  return (
    <div className={`rounded-xl border p-3 md:p-4 ${colorMap[color]}`}>
      <p className="text-[11px] md:text-sm font-medium opacity-80 leading-tight">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-1">{value.toLocaleString('pt-BR')}</p>
      <p className="text-[10px] md:text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  )
}
