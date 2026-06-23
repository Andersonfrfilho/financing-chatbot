import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation } from '@/hooks/useRouter'
import { useAuthStore } from '@/store/authStore'
import { useWaitingNotifications } from '@/hooks/useWaitingNotifications'
import { api } from '@/lib/api'

const navItems = [
  { href: '/',             label: 'Dashboard',  icon: '📊' },
  { href: '/leads',        label: 'Leads',       icon: '🎯' },
  { href: '/clients',      label: 'Clientes',    icon: '👥' },
  { href: '/simulations',  label: 'Simulações',  icon: '🏦' },
  { href: '/sessions',     label: 'Sessões',     icon: '💬' },
  { href: '/conversations',label: 'Conversas',   icon: '🗨️', badge: true },
  { href: '/users',        label: 'Usuários',    icon: '👤' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const waitingCount = useWaitingNotifications()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  const close = () => setOpen(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Overlay mobile ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        w-72 bg-white shadow-xl
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64 md:shadow-none md:border-r md:border-gray-200
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h1 className="text-base font-bold text-primary-700 leading-tight">Financiamento Bot</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Painel Operacional</p>
          </div>
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={close}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-lg leading-none w-6 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && waitingCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {waitingCount > 99 ? '99+' : waitingCount}
                  </span>
                )}
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                )}
              </a>
            )
          })}
        </nav>

        {/* Footer user */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 truncate capitalize">{user?.role?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
          >
            <Menu size={20} />
          </button>
          <h1 className="flex-1 text-sm font-bold text-primary-700">Financiamento Bot</h1>
          {waitingCount > 0 && (
            <a href="/conversations" className="relative">
              <span className="text-xl">🗨️</span>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {waitingCount > 99 ? '99+' : waitingCount}
              </span>
            </a>
          )}
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
