import { useAuthStore } from '@/store/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { SimulationsPage } from '@/pages/SimulationsPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { ConversationsPage } from '@/pages/ConversationsPage'
import { BanksPage } from '@/pages/BanksPage'
import { UsersPage } from '@/pages/UsersPage'

const ROUTES: Record<string, React.ComponentType> = {
  '/': DashboardPage,
  '/leads': LeadsPage,
  '/clients': ClientsPage,
  '/simulations': SimulationsPage,
  '/sessions': SessionsPage,
  '/conversations': ConversationsPage,
  '/banks': BanksPage,
  '/users': UsersPage,
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const path = window.location.pathname

  if (!isAuthenticated || path === '/login') {
    return <LoginPage />
  }

  const PageComponent = ROUTES[path] ?? DashboardPage

  return (
    <Layout>
      <PageComponent />
    </Layout>
  )
}
