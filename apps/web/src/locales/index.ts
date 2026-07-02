import { common }        from './shared/common'
import { navigation }    from './shared/navigation'
import { auth }          from './modules/auth'
import { dashboard }     from './modules/dashboard'
import { leads }         from './modules/leads'
import { clients }       from './modules/clients'
import { conversations } from './modules/conversations'
import { sessions }      from './modules/sessions'
import { simulations }   from './modules/simulations'
import { users }         from './modules/users'
import { roles }         from './modules/roles'
import { settings }      from './modules/settings'
import { categories }    from './modules/categories'
import { products }      from './modules/products'
import { banks }         from './modules/banks'
import { catalogs }      from './modules/catalogs'
import { billing }       from './modules/billing'

export const locale = {
  common,
  navigation,
  auth,
  dashboard,
  leads,
  clients,
  conversations,
  sessions,
  simulations,
  users,
  roles,
  settings,
  categories,
  products,
  banks,
  catalogs,
  billing,
} as const

// Re-export modules individually for tree-shaking in large pages
export {
  common,
  navigation,
  auth,
  dashboard,
  leads,
  clients,
  conversations,
  sessions,
  simulations,
  users,
  roles,
  settings,
  categories,
  products,
  banks,
  catalogs,
  billing,
}

// Utility type: extracts the return type of string-functions and plain strings
export type LocaleLeaf = string | ((...args: never[]) => string)
