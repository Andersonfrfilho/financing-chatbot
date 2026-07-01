// @ts-nocheck
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Edit2, Trash2, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { categories as text } from '@/locales'
import { useSortableData } from '@/hooks/useSortableData'
import {
  Button, Input, Skeleton, TableSkeleton, SortableHead,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui'

type Category = {
  id: string
  name: string
  description?: string
  active: boolean
  syncStatus: 'pending' | 'synced' | 'error'
  syncError?: string | null
  createdAt: string
}

const SYNC_BADGE: Record<Category['syncStatus'], string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
  synced:  'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  error:   'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
}

const emptyForm = { name: '', description: '', active: true }

export function CategoriesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = debouncedSearch || active
  const clearFilters = () => {
    setSearch('')
    setActive('')
  }

  const { data, isLoading } = useQuery<{ data: Category[]; total: number }>({
    queryKey: ['categories', debouncedSearch, active, page, limit],
    queryFn: () => api.get('/categories', {
      params: {
        search: debouncedSearch || undefined,
        active: active || undefined,
        page,
        limit,
      },
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Category>(data?.data, 'name', 'asc')

  const createCategory = useMutation({
    mutationFn: () => api.post('/categories', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setShowCreate(false); setForm(emptyForm) },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & typeof emptyForm) => api.put(`/categories/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setEditingId(null) },
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const retrySync = useMutation({
    mutationFn: (id: string) => api.post(`/categories/${id}/retry-sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const startEdit = (category: Category) => {
    setForm({ name: category.name, description: category.description || '', active: category.active })
    setEditingId(category.id)
  }

  const closeDialog = () => {
    setShowCreate(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const save = () => {
    if (editingId) {
      updateCategory.mutate({ id: editingId, ...form })
    } else {
      createCategory.mutate()
    }
  }

  const saving = createCategory.isPending || updateCategory.isPending

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <Skeleton className="h-9 w-36" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.subtitle(data?.total ?? 0)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-lg">{text.description}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="self-start">{text.newButton}</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder={text.filters.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select value={active} onValueChange={(v: string) => { setActive(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={text.filters.active} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.allStatus}</SelectItem>
            <SelectItem value="true">{text.activeLabel}</SelectItem>
            <SelectItem value="false">{text.inactiveLabel}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500">
            <X size={14} />
            <span className="ml-1">{text.filters.clearAll}</span>
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={text.columns.name} field="name" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label={text.columns.description} field="description" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <SortableHead label={text.columns.active} field="active" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <TableHead>{text.columns.sync}</TableHead>
              <TableHead>{text.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium text-sm">{category.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-gray-500 dark:text-gray-400">{category.description || '—'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${category.active ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {category.active ? text.activeLabel : text.inactiveLabel}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SYNC_BADGE[category.syncStatus]}`} title={category.syncError ?? undefined}>
                      {text.sync[category.syncStatus]}
                    </span>
                    {category.syncStatus === 'error' && (
                      <Button variant="ghost" size="sm" onClick={() => retrySync.mutate(category.id)} disabled={retrySync.isPending} title={text.sync.retry}>
                        <RefreshCw size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(category)} title="Editar">
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { if (confirm(text.deleteConfirm)) deleteCategory.mutate(category.id) }}
                      disabled={deleteCategory.isPending}
                      title="Excluir"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{text.empty}</p>}
      </div>

      {data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Exibir</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>por página</span>
            <span className="ml-2 text-gray-400">({data.total} total)</span>
          </div>
          {data.total > limit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} /> Anterior
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Pág. {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>
                Próxima <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={showCreate || !!editingId} onOpenChange={(open: boolean) => { if (!open) closeDialog() }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? text.form.editTitle : text.form.createTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{text.form.name}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{text.form.description}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer"
              />
              {text.form.active}
            </label>
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
