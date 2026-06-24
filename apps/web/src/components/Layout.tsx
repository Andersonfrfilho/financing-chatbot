import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation } from '@/hooks/useRouter'
import { useAuthStore } from '@/store/authStore'
import { useWaitingNotifications } from '@/hooks/useWaitingNotifications'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { api } from '@/lib/api'
import { ThemeToggle } from './ThemeToggle'
import { AdaTechLogoFull } from './AdaTechLogo'

const navGroups = [
  {
    label: 'Geral',
    items: [
      { href: '/',             label: 'Dashboard',  icon: '📊' },
      { href: '/conversations',label: 'Conversas',  icon: '🗨️', badge: true },
      { href: '/sessions',     label: 'Sessões',    icon: '💬' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/clients',      label: 'Clientes',   icon: '👥' },
      { href: '/leads',        label: 'Leads',      icon: '🎯' },
      { href: '/simulations',  label: 'Simulações', icon: '🏦' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/users',        label: 'Usuários',   icon: '👤' },
      { href: '/settings',     label: 'Configurações', icon: '⚙️' },
    ],
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const location = useLocation()
  const waitingCount = useWaitingNotifications()
  const [open, setOpen] = useState(false)

  const { data: company } = useCompanySettings()
  const companyName = company?.company_name || import.meta.env.VITE_COMPANY_NAME || 'Sistema'
  const companyLogo = company?.company_logo_url || import.meta.env.VITE_COMPANY_LOGO_URL || ''
  const simEnabled = company?.simulations_enabled !== 'false'

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  const close = () => setOpen(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

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
        w-72 bg-white dark:bg-gray-900 shadow-xl dark:shadow-black/40
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64 md:shadow-none md:border-r md:border-gray-200 dark:md:border-gray-800
      `}>

        {/* Logo / Branding */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">{companyName}</h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Painel Operacional</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={close}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav com separadores por grupo */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.filter((item) => item.href !== '/simulations' || simEnabled).map((item) => {
                  const active = location === item.href
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-150
                        ${active
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent'
                        }
                      `}
                    >
                      <span className="text-base leading-none w-5 text-center flex-shrink-0">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {(item as any).badge && waitingCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                          {waitingCount > 99 ? '99+' : waitingCount}
                        </span>
                      )}
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer user + copyright */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate capitalize">{user?.role?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors font-medium"
          >
            Sair
          </button>

          {/* AdA Technology copyright */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
            <AdaTechLogoFull
              height={14}
              variant="auto"
              className="text-gray-400 dark:text-gray-600 opacity-70"
            />
            <span className="text-[10px] text-gray-400 dark:text-gray-600">© {new Date().getFullYear()} AdA Technology</span>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            <Menu size={20} />
          </button>
          <h1 className="flex-1 text-sm font-bold text-gray-900 dark:text-gray-100">{companyName}</h1>
          {waitingCount > 0 && (
            <a href="/conversations" className="relative">
              <span className="text-xl">🗨️</span>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {waitingCount > 99 ? '99+' : waitingCount}
              </span>
            </a>
          )}
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm flex-shrink-0">
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
