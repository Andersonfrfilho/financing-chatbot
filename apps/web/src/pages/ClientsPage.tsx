// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Trash2, Edit2 } from 'lucide-react'
import { api } from '@/lib/api'
import { clients as text } from '@/locales'
import { Button, Input, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
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
  const [page, setPage] = useState(1)
  const [showAllData, setShowAllData] = useState(false)
  const [visibleClients, setVisibleClients] = useState<Set<string>>(new Set())
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', city: '', state: '', whatsappNumber: '', address: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ['clients', search, page],
    queryFn: () => api.get('/clients', { params: { search: search || undefined, page, limit: 20 } }).then((r: any) => r.data),
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Client>(data?.data, 'createdAt')

  const updateClient = useMutation({
    mutationFn: (payload: any) => api.put(`/clients/${payload.id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setEditingId(null) },
  })

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setSelectedClients(new Set()) },
  })

  const deleteMultiple = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.delete(`/clients/${id}`))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setSelectedClients(new Set()) },
  })

  const toggleVisible = (id: string) => {
    setVisibleClients((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const startEdit = (client: Client) => {
    setEditForm({ name: client.name, email: client.email || '', city: client.city || '', state: client.state || '', whatsappNumber: client.whatsappNumber, address: '' })
    setEditingId(client.id)
  }

  const isVisible = (id: string) => showAllData || visibleClients.has(id)

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
          <Input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full sm:w-52"
          />
          <Button variant={showAllData ? 'default' : 'outline'} size="sm" onClick={() => setShowAllData(!showAllData)}>
            {showAllData ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="ml-1 hidden sm:inline">{showAllData ? 'Esconder' : 'Mostrar'}</span>
          </Button>
          {selectedClients.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Deletar ${selectedClients.size} cliente(s)?`)) deleteMultiple.mutate(Array.from(selectedClients)) }} disabled={deleteMultiple.isPending}>
              <Trash2 size={14} />
              <span className="ml-1">{selectedClients.size}</span>
            </Button>
          )}
        </div>
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

      {data && data.total > 20 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
          <span className="px-3 py-2 text-sm text-gray-600">Pág. {page}</span>
          <button className="btn-secondary text-sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>Próxima</button>
        </div>
      )}

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
