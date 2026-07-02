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
import { RolesPage } from '@/pages/RolesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CatalogsPage } from '@/pages/CatalogsPage'

const ROUTES: Record<string, React.ComponentType> = {
  '/': DashboardPage,
  '/leads': LeadsPage,
  '/clients': ClientsPage,
  '/simulations': SimulationsPage,
  '/sessions': SessionsPage,
  '/conversations': ConversationsPage,
  '/users': UsersPage,
  '/roles': RolesPage,
  '/settings': SettingsPage,
  '/categories': CategoriesPage,
  '/products': ProductsPage,
  '/catalogs': CatalogsPage,
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const path = window.location.pathname

  if (path === '/reset-password') {
    return <ResetPasswordPage />
  }

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
