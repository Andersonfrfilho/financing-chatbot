// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import Papa from 'papaparse'
import { Edit2, Trash2, RefreshCw, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { products as text } from '@/locales'
import { useSortableData } from '@/hooks/useSortableData'
import {
  Button, Input, Skeleton, TableSkeleton, SortableHead,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui'

type Product = {
  id: string
  categoryId: string
  retailerId: string
  name: string
  description?: string
  priceInCents: number
  currency: string
  imageUrl?: string
  active: boolean
  availability?: string
  condition?: string
  syncStatus: 'pending' | 'synced' | 'error'
  syncError?: string | null
  createdAt: string
}

type Category = { id: string; name: string }

const SYNC_BADGE: Record<Product['syncStatus'], string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
  synced:  'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  error:   'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
}

const formatPrice = (priceInCents: number, currency: string) =>
  (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency })

const emptyForm = {
  categoryId: '',
  retailerId: '',
  name: '',
  description: '',
  priceInCents: 0,
  currency: 'BRL',
  imageUrl: '',
  active: true,
  availability: 'in stock',
  condition: 'new',
}

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [priceInput, setPriceInput] = useState('0,00')
  const [showImport, setShowImport] = useState(false)
  const [csvFileName, setCsvFileName] = useState('')
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [importResult, setImportResult] = useState<{ succeeded: unknown[]; failed: { row: number; error: string }[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = debouncedSearch || categoryId || active
  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
    setActive('')
  }

  const { data, isLoading } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ['products', debouncedSearch, categoryId, active, page, limit],
    queryFn: () => api.get('/products', {
      params: {
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        active: active || undefined,
        page,
        limit,
      },
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { data: categories } = useQuery<{ data: Category[]; total: number }>({
    queryKey: ['categories', 'all'],
    queryFn: () => api.get('/categories', { params: { limit: 100 } }).then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Product>(data?.data, 'name', 'asc')

  const categoryName = (id: string) => categories?.data.find((c) => c.id === id)?.name ?? '—'

  const createProduct = useMutation({
    mutationFn: () => api.post('/products', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeDialog() },
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & typeof emptyForm) => api.put(`/products/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeDialog() },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const retrySync = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/retry-sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const bulkImport = useMutation({
    mutationFn: (rows: Record<string, string>[]) => api.post('/products/bulk-import', {
      rows: rows.map((row) => ({
        categoryName: row.categoryName,
        retailerId:   row.retailerId,
        name:         row.name,
        description:  row.description || undefined,
        price:        row.price,
        currency:     row.currency || undefined,
        imageUrl:     row.imageUrl || undefined,
        availability: row.availability || undefined,
        condition:    row.condition || undefined,
        active:       row.active === undefined || row.active === '' ? undefined : row.active === 'true',
      })),
    }).then((r: any) => r.data),
    onSuccess: (result) => { setImportResult(result); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setImportResult(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setCsvRows(results.data),
    })
    event.target.value = ''
  }

  const closeImportDialog = () => {
    setShowImport(false)
    setCsvFileName('')
    setCsvRows([])
    setImportResult(null)
  }

  const startEdit = (product: Product) => {
    setForm({
      categoryId:   product.categoryId,
      retailerId:   product.retailerId,
      name:         product.name,
      description:  product.description || '',
      priceInCents: product.priceInCents,
      currency:     product.currency,
      imageUrl:     product.imageUrl || '',
      active:       product.active,
      availability: product.availability || 'in stock',
      condition:    product.condition || 'new',
    })
    setPriceInput((product.priceInCents / 100).toFixed(2).replace('.', ','))
    setEditingId(product.id)
  }

  const closeDialog = () => {
    setShowCreate(false)
    setEditingId(null)
    setForm(emptyForm)
    setPriceInput('0,00')
  }

  const handlePriceChange = (value: string) => {
    setPriceInput(value)
    const normalized = Number(value.replace(/\./g, '').replace(',', '.'))
    setForm({ ...form, priceInCents: Number.isFinite(normalized) ? Math.round(normalized * 100) : 0 })
  }

  const save = () => {
    if (editingId) {
      updateProduct.mutate({ id: editingId, ...form })
    } else {
      createProduct.mutate()
    }
  }

  const saving = createProduct.isPending || updateProduct.isPending
  const canSave = form.name && form.retailerId && form.categoryId

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <Skeleton className="h-9 w-36" />
      </div>
      <TableSkeleton rows={6} cols={6} />
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
        <div className="flex gap-2 self-start">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload size={14} className="mr-1.5" />{text.bulkImport.button}
          </Button>
          <Button onClick={() => setShowCreate(true)}>{text.newButton}</Button>
        </div>
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
        <Select value={categoryId} onValueChange={(v: string) => { setCategoryId(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={text.filters.category} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.allCategories}</SelectItem>
            {categories?.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
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
              <TableHead className="hidden sm:table-cell">{text.columns.category}</TableHead>
              <SortableHead label={text.columns.price} field="priceInCents" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <TableHead className="hidden md:table-cell">{text.columns.retailerId}</TableHead>
              <SortableHead label={text.columns.active} field="active" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <TableHead>{text.columns.sync}</TableHead>
              <TableHead>{text.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium text-sm">{product.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-gray-500 dark:text-gray-400">{categoryName(product.categoryId)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{formatPrice(product.priceInCents, product.currency)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs font-mono">{product.retailerId}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${product.active ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {product.active ? text.activeLabel : text.inactiveLabel}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SYNC_BADGE[product.syncStatus]}`} title={product.syncError ?? undefined}>
                      {text.sync[product.syncStatus]}
                    </span>
                    {product.syncStatus === 'error' && (
                      <Button variant="ghost" size="sm" onClick={() => retrySync.mutate(product.id)} disabled={retrySync.isPending} title={text.sync.retry}>
                        <RefreshCw size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(product)} title="Editar">
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { if (confirm(text.deleteConfirm)) deleteProduct.mutate(product.id) }}
                      disabled={deleteProduct.isPending}
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
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">{text.form.category}</label>
              <Select value={form.categoryId} onValueChange={(v: string) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories?.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{text.form.name}</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">{text.form.retailerId}</label>
                <Input value={form.retailerId} onChange={(e) => setForm({ ...form, retailerId: e.target.value })} disabled={!!editingId} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{text.form.description}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{text.form.price}</label>
                <Input value={priceInput} onChange={(e) => handlePriceChange(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="text-sm font-medium">{text.form.currency}</label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{text.form.imageUrl}</label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{text.form.availability}</label>
                <Select value={form.availability} onValueChange={(v: string) => setForm({ ...form, availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(text.availability).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{text.form.condition}</label>
                <Select value={form.condition} onValueChange={(v: string) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(text.condition).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <Button onClick={save} disabled={saving || !canSave}>
              {saving ? text.form.saving : (editingId ? text.form.save : text.form.create)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={(open) => !open && closeImportDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{text.bulkImport.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} className="mr-1.5" />
              {csvFileName ? text.bulkImport.changeFile : text.bulkImport.chooseFile}
            </Button>

            {csvFileName && (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{csvFileName}</p>
                <p>{csvRows.length > 0 ? text.bulkImport.previewCount(csvRows.length) : text.bulkImport.emptyFile}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">{text.bulkImport.columnsHint}</p>

            {importResult && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{text.bulkImport.resultTitle}</p>
                <p className="text-sm text-green-600 dark:text-green-400">{text.bulkImport.succeeded(importResult.succeeded.length)}</p>
                {importResult.failed.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600 dark:text-red-400">{text.bulkImport.failed(importResult.failed.length)}</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 max-h-40 overflow-y-auto">
                      {importResult.failed.map((failure) => (
                        <li key={failure.row}>{text.bulkImport.rowLabel} {failure.row}: {failure.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>
              {importResult ? text.bulkImport.close : text.bulkImport.cancel}
            </Button>
            {!importResult && (
              <Button
                onClick={() => bulkImport.mutate(csvRows)}
                disabled={bulkImport.isPending || csvRows.length === 0}
              >
                {bulkImport.isPending ? text.bulkImport.importing : text.bulkImport.import}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
