import { useLocation } from '@/hooks/useRouter'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/leads', label: 'Leads', icon: '🎯' },
  { href: '/clients', label: 'Clientes', icon: '👥' },
  { href: '/simulations', label: 'Simulações', icon: '🏦' },
  { href: '/sessions', label: 'Sessões', icon: '💬' },
  { href: '/conversations', label: 'Conversas', icon: '🗨️' },
  { href: '/banks', label: 'Bancos', icon: '🏛️' },
  { href: '/users', label: 'Usuários', icon: '👤' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()

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
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === item.href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
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
