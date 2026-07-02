// @ts-nocheck
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Eye, EyeOff, Trash2, Edit2, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { usePrivacyStore } from '@/store/privacyStore'
import { common } from '@/locales'
import { clients as text } from '@/locales'
import { Button, Input, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
import { BRAZILIAN_STATES } from '@/lib/constants'
import { useSortableData } from '@/hooks/useSortableData'

type Client = {
  id: string
  name: string
  whatsappNumber: string
  email?: string
  city?: string
  state?: string
  createdAt: string
}

const obfuscateEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return local[0] + '*'.repeat(Math.max(0, local.length - 2)) + local[local.length - 1] + '@' + domain
}

export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [createdAfter, setCreatedAfter] = useState('')
  const [createdBefore, setCreatedBefore] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { isPrivate, togglePrivacy } = usePrivacyStore()
  const [visibleClients, setVisibleClients] = useState<Set<string>>(new Set())
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', city: '', state: '', whatsappNumber: '', address: '' })
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', whatsappNumber: '', email: '', city: '', state: '' })
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ['clients', debouncedSearch, city, state, createdAfter, createdBefore, page, limit],
    queryFn: () => api.get('/clients', {
      params: {
        search: debouncedSearch || undefined,
        city: city || undefined,
        state: state || undefined,
        createdAfter: createdAfter || undefined,
        createdBefore: createdBefore || undefined,
        page,
        limit,
      }
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Client>(data?.data, 'createdAt')

  const updateClient = useMutation({
    mutationFn: (payload: any) => api.put(`/clients/${payload.id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setEditingId(null) },
  })

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setSelectedClients(new Set()) },
  })

  const deleteMultiple = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.delete(`/clients/${id}`))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setSelectedClients(new Set()) },
  })

  const createClient = useMutation({
    mutationFn: (payload: typeof createForm) => api.post('/clients', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setCreating(false)
      setCreateForm({ name: '', whatsappNumber: '', email: '', city: '', state: '' })
    },
  })

  const toggleVisible = (id: string) => {
    setVisibleClients((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const startEdit = (client: Client) => {
    setEditForm({ name: client.name, email: client.email || '', city: client.city || '', state: client.state || '', whatsappNumber: client.whatsappNumber, address: '' })
    setEditingId(client.id)
  }

  const isVisible = (id: string) => !isPrivate || visibleClients.has(id)

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
        <Skeleton className="h-9 w-48" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.subtitle(data?.total ?? 0)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} />
            <span className="ml-1 hidden sm:inline">{text.actions.create}</span>
          </Button>
          {selectedClients.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Deletar ${selectedClients.size} cliente(s)?`)) deleteMultiple.mutate(Array.from(selectedClients)) }} disabled={deleteMultiple.isPending}>
              <Trash2 size={14} />
              <span className="ml-1">{selectedClients.size}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          placeholder="Nome, e-mail ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-52"
        />
        <Input
          type="search"
          placeholder="Cidade..."
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1) }}
          className="w-full sm:w-36"
        />
        <select
          value={state}
          onChange={(e) => { setState(e.target.value); setPage(1) }}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-24"
        >
          <option value="">Estado</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        <Input
          type="date"
          value={createdAfter}
          onChange={(e) => { setCreatedAfter(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        <Input
          type="date"
          value={createdBefore}
          onChange={(e) => { setCreatedBefore(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        <Button
          variant={isPrivate ? 'outline' : 'default'}
          size="sm"
          onClick={togglePrivacy}
          className="gap-1.5 text-xs ml-auto"
        >
          {isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPrivate ? common.privacy.showPhoneNumbers : common.privacy.hidePhoneNumbers}
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox"
                  checked={selectedClients.size === data?.data.length && (data?.data.length ?? 0) > 0}
                  onChange={(e) => setSelectedClients(e.target.checked ? new Set(data?.data.map((c) => c.id) ?? []) : new Set())}
                  className="rounded" />
              </TableHead>
              <SortableHead label="Nome" field="name" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="WhatsApp" field="whatsappNumber" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="E-mail" field="email" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <SortableHead label="Cidade/UF" field="city" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Cadastro" field="createdAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((client) => (
              <TableRow key={client.id} className={selectedClients.has(client.id) ? 'bg-blue-50' : ''}>
                <TableCell>
                  <input type="checkbox" checked={selectedClients.has(client.id)}
                    onChange={(e) => setSelectedClients((prev) => { const s = new Set(prev); e.target.checked ? s.add(client.id) : s.delete(client.id); return s })}
                    className="rounded" />
                </TableCell>
                <TableCell className="font-medium text-sm">{client.name}</TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {isVisible(client.id) ? formatPhone(client.whatsappNumber) : obfuscatePhone(client.whatsappNumber)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  {client.email ? (isVisible(client.id) ? client.email : obfuscateEmail(client.email)) : '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {client.city && client.state ? `${client.city}/${client.state}` : '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">
                  {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleVisible(client.id)}>
                      {isVisible(client.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(client)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Deletar ${client.name}?`)) deleteClient.mutate(client.id) }} disabled={deleteClient.isPending}>
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
            <span>{common.pagination.show}</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>{common.pagination.perPage}</span>
            <span className="ml-2 text-gray-400">
              {common.pagination.total(data.total)}
            </span>
          </div>
          {data.total > limit && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>{common.pagination.previous}</button>
              <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{common.pagination.page(page)}</span>
              <button className="btn-secondary text-sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>{common.pagination.next}</button>
            </div>
          )}
        </div>
      )}

      {/* Criar cliente */}
      <Dialog open={creating} onOpenChange={() => setCreating(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{text.create.title}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">{text.create.name}</label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder={text.create.namePlaceholder} />
            </div>
            <div>
              <label className="text-sm font-medium">{text.create.whatsapp}</label>
              <Input type="tel" value={formatPhone(createForm.whatsappNumber)}
                onChange={(e) => setCreateForm({ ...createForm, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                placeholder={text.create.whatsappPlaceholder} className="font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium">{text.create.email}</label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder={text.create.emailPlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{text.create.city}</label>
                <Input value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">{text.create.state}</label>
                <select
                  value={createForm.state}
                  onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={() => createClient.mutate(createForm)} disabled={createClient.isPending || !createForm.name || !createForm.whatsappNumber}>
              {createClient.isPending ? '...' : text.create.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp</label>
              <Input type="tel" value={formatPhone(editForm.whatsappNumber)}
                onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                placeholder="🇧🇷 +55 (16) 9 9123-1234" className="font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Endereço</label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Rua, número, complemento" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">UF</label>
                <Input value={editForm.state} maxLength={2} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={() => editingId && updateClient.mutate({ id: editingId, ...editForm })} disabled={updateClient.isPending}>
              {updateClient.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
