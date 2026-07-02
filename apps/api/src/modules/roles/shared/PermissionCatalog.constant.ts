export type PermissionCatalogEntry = {
  resource: string
  label:    string
  actions:  readonly string[]
}

export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = [
  { resource: 'clients',     label: 'Clientes',         actions: ['read', 'write', 'delete'] },
  { resource: 'leads',       label: 'Leads',            actions: ['read', 'write'] },
  { resource: 'simulations', label: 'Simulações',       actions: ['read', 'write'] },
  { resource: 'products',    label: 'Produtos',         actions: ['read', 'write', 'delete'] },
  { resource: 'categories',  label: 'Categorias',       actions: ['read', 'write', 'delete'] },
  { resource: 'catalogs',    label: 'Catálogos',        actions: ['read', 'write'] },
  { resource: 'banks',       label: 'Bancos',           actions: ['read', 'write'] },
  { resource: 'sessions',    label: 'Sessões',          actions: ['read', 'write'] },
  { resource: 'dashboard',   label: 'Dashboard',        actions: ['read'] },
  { resource: 'settings',    label: 'Configurações',    actions: ['read', 'write'] },
  { resource: 'fipe',        label: 'Tabela FIPE',      actions: ['read'] },
  { resource: 'users',       label: 'Usuários',         actions: ['read', 'write'] },
  { resource: 'roles',       label: 'Perfis de acesso', actions: ['read', 'write', 'delete'] },
] as const
