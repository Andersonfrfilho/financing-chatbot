import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, Skeleton } from '@/components/ui'
import { dashboard, common } from '@/locales'

type DashboardStats = {
  leads: { total: number; byStatus: Record<string, number>; newToday: number; newThisWeek: number }
  clients: { total: number; newToday: number; newThisWeek: number }
  simulations: { total: number; byFinancingType: Record<string, number>; todayTotal: number }
  sessions: { active: number; byState: Record<string, number> }
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

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
    name: (dashboard.statusLabels as Record<string, string>)[k] ?? k, value: v,
  }))

  const financingChartData = Object.entries(stats.simulations.byFinancingType).map(([k, v]) => ({
    name: (dashboard.financingLabels as Record<string, string>)[k] ?? k, value: v,
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
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm md:text-base">{dashboard.charts.simulationsByModality}</h3>
          {financingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={financingChartData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">{common.empty.noData}</p>
          )}
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
