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
import { settings }      from './modules/settings'
import { categories }    from './modules/categories'
import { products }      from './modules/products'
import { banks }         from './modules/banks'

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
  settings,
  categories,
  products,
  banks,
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
  settings,
  categories,
  products,
  banks,
}

// Utility type: extracts the return type of string-functions and plain strings
export type LocaleLeaf = string | ((...args: never[]) => string)
