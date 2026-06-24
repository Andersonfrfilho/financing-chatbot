import { useAuthStore } from '@/store/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { SimulationsPage } from '@/pages/SimulationsPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { ConversationsPage } from '@/pages/ConversationsPage'
import { UsersPage } from '@/pages/UsersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useCompanySettings } from '@/hooks/useCompanySettings'

const ROUTES: Record<string, React.ComponentType> = {
  '/': DashboardPage,
  '/leads': LeadsPage,
  '/clients': ClientsPage,
  '/simulations': SimulationsPage,
  '/sessions': SessionsPage,
  '/conversations': ConversationsPage,
  '/users': UsersPage,
  '/settings': SettingsPage,
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const path = window.location.pathname
  const { data: company } = useCompanySettings()

  if (path === '/reset-password') {
    return <ResetPasswordPage />
  }

  if (!isAuthenticated || path === '/login') {
    return <LoginPage />
  }

  let PageComponent = ROUTES[path] ?? DashboardPage
  if (path === '/simulations' && company?.simulations_enabled === 'false') {
    PageComponent = DashboardPage
  }

  return (
    <Layout>
      <PageComponent />
    </Layout>
  )
}
