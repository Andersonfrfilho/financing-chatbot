// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { roles as text } from '@/locales'
import { useSortableData } from '@/hooks/useSortableData'
import {
  Button, Input, Skeleton, TableSkeleton, SortableHead,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui'

type Permission = { resource: string; action: string }

type Role = {
  id: string
  name: string
  description?: string | null
  permissions: Permission[]
  usersCount: number
  createdAt: string
}

type PermissionCatalogEntry = {
  resource: string
  label: string
  actions: readonly string[]
}

const emptyForm = { name: '', description: '', fullAccess: false, permissions: [] as Permission[] }

function isFullAccess(permissions: Permission[]) {
  return permissions.some((p) => p.resource === '*' && p.action === '*')
}

function flattenPermissions(permissions: Permission[], catalog: PermissionCatalogEntry[]): Permission[] {
  const flattened: Permission[] = []
  for (const entry of catalog) {
    for (const action of entry.actions) {
      const checked = permissions.some((p) =>
        (p.resource === entry.resource && p.action === action) ||
        (p.resource === entry.resource && p.action === '*'),
      )
      if (checked) flattened.push({ resource: entry.resource, action })
    }
  }
  return flattened
}

function hasPermission(permissions: Permission[], resource: string, action: string) {
  return permissions.some((p) => p.resource === resource && p.action === action)
}

function togglePermission(permissions: Permission[], resource: string, action: string): Permission[] {
  if (hasPermission(permissions, resource, action)) {
    return permissions.filter((p) => !(p.resource === resource && p.action === action))
  }
  return [...permissions, { resource, action }]
}

export function RolesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingIsAdmin, setEditingIsAdmin] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errorMessage, setErrorMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: roleList, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r: any) => r.data),
  })

  const { data: catalog } = useQuery<PermissionCatalogEntry[]>({
    queryKey: ['roles', 'catalog'],
    queryFn: () => api.get('/roles/permissions-catalog').then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Role>(roleList, 'name', 'asc')

  const toPayload = (values: typeof emptyForm) => ({
    name: values.name,
    description: values.description || null,
    permissions: values.fullAccess ? [{ resource: '*', action: '*' }] : values.permissions,
  })

  const extractErrorMessage = (error: any) => error?.response?.data?.message ?? ''

  const createRole = useMutation({
    mutationFn: () => api.post('/roles', toPayload(form)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeDialog() },
    onError: (error: any) => setErrorMessage(extractErrorMessage(error)),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & typeof emptyForm) => api.put(`/roles/${id}`, toPayload(payload)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeDialog() },
    onError: (error: any) => setErrorMessage(extractErrorMessage(error)),
  })

  const deleteRole = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
    onError: (error: any) => alert(extractErrorMessage(error) || text.deleteConfirm),
  })

  const startEdit = (role: Role) => {
    const fullAccess = isFullAccess(role.permissions)
    setForm({
      name: role.name,
      description: role.description || '',
      fullAccess,
      permissions: fullAccess ? [] : flattenPermissions(role.permissions, catalog ?? []),
    })
    setEditingIsAdmin(role.name === 'admin')
    setErrorMessage('')
    setEditingId(role.id)
  }

  const closeDialog = () => {
    setShowCreate(false)
    setEditingId(null)
    setEditingIsAdmin(false)
    setErrorMessage('')
    setForm(emptyForm)
  }

  const save = () => {
    setErrorMessage('')
    if (editingId) {
      updateRole.mutate({ id: editingId, ...form })
    } else {
      createRole.mutate()
    }
  }

  const saving = createRole.isPending || updateRole.isPending

  const deleteBlockedReason = (role: Role) => {
    if (role.name === 'admin') return text.deleteBlocked.admin
    if (role.usersCount > 0) return text.deleteBlocked.inUse
    return null
  }

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <Skeleton className="h-9 w-36" />
      </div>
      <TableSkeleton rows={4} cols={5} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.subtitle(roleList?.length ?? 0)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-lg">{text.description}</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setErrorMessage(''); setShowCreate(true) }} className="self-start">{text.newButton}</Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={text.columns.name} field="name" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label={text.columns.description} field="description" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <TableHead>{text.columns.permissions}</TableHead>
              <SortableHead label={text.columns.usersCount} field="usersCount" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <TableHead>{text.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((role) => {
              const blockedReason = deleteBlockedReason(role)
              return (
                <TableRow key={role.id}>
                  <TableCell className="font-medium text-sm capitalize">{role.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500 dark:text-gray-400">{role.description || '—'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
                      {isFullAccess(role.permissions) ? text.fullAccess : text.permissionCount(role.permissions.length)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{role.usersCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(role)} title="Editar">
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { if (!blockedReason && confirm(text.deleteConfirm)) deleteRole.mutate(role.id) }}
                        disabled={!!blockedReason || deleteRole.isPending}
                        title={blockedReason ?? 'Excluir'}
                      >
                        <Trash2 size={14} className={blockedReason ? 'text-gray-300 dark:text-gray-600' : 'text-red-500'} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!roleList?.length && <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{text.empty}</p>}
      </div>

      <Dialog open={showCreate || !!editingId} onOpenChange={(open: boolean) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? text.form.editTitle : text.form.createTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">{text.form.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{text.form.description}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.fullAccess}
                  disabled={editingIsAdmin}
                  onChange={(e) => setForm({ ...form, fullAccess: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer"
                />
                {text.fullAccess}
              </label>
            </div>

            {!form.fullAccess && (
              <div>
                <label className="text-sm font-medium">{text.form.permissions}</label>
                <div className="mt-2 border rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                  {catalog?.map((entry) => (
                    <div key={entry.resource} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                      <span className="text-sm font-medium w-32 flex-shrink-0">{entry.label}</span>
                      <div className="flex flex-wrap gap-3">
                        {entry.actions.map((action) => (
                          <label key={action} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasPermission(form.permissions, entry.resource, action)}
                              onChange={() => setForm({ ...form, permissions: togglePermission(form.permissions, entry.resource, action) })}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer"
                            />
                            {action}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">{text.form.jwtStalenessNote}</p>

            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {errorMessage}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{text.form.cancel}</Button>
            <Button onClick={save} disabled={saving || !form.name}>
              {saving ? text.form.saving : (editingId ? text.form.save : text.form.create)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
