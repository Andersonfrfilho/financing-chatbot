import { useLocation } from '@/hooks/useRouter'
import { useAuthStore } from '@/store/authStore'
import { useWaitingNotifications } from '@/hooks/useWaitingNotifications'
import { api } from '@/lib/api'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊', tooltip: 'Visão consolidada com estatísticas em tempo real' },
  { href: '/leads', label: 'Leads', icon: '🎯', tooltip: 'Gerenciamento de potenciais clientes e suas simulações' },
  { href: '/clients', label: 'Clientes', icon: '👥', tooltip: 'Cadastro e edição de clientes com histórico' },
  { href: '/simulations', label: 'Simulações', icon: '🏦', tooltip: 'Histórico de todas as simulações de financiamento' },
  { href: '/sessions', label: 'Sessões', icon: '💬', tooltip: 'Monitoramento em tempo real das sessões do bot' },
  { href: '/conversations', label: 'Conversas', icon: '🗨️', tooltip: 'Histórico de conversas e atendimento ao cliente', badge: true },
  { href: '/users', label: 'Usuários', icon: '👤', tooltip: 'Gerenciamento de usuários e permissões' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const waitingCount = useWaitingNotifications()

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-primary-700">Financiamento Bot</h1>
          <p className="text-xs text-gray-500 mt-0.5">Painel Operacional</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={item.tooltip}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === item.href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && waitingCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {waitingCount > 99 ? '99+' : waitingCount}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role?.name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full text-xs">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
