// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Trash2, Edit2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { formatPhone, obfuscatePhone } from '@/lib/phone'

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
  return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain
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

  const { data } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ['clients', search, page],
    queryFn: () =>
      api.get('/clients', { params: { search: search || undefined, page, limit: 20 } }).then((r: any) => r.data),
  })

  const updateClient = useMutation({
    mutationFn: (payload: { id: string; name: string; email?: string; city?: string; state?: string }) =>
      api.put(`/clients/${payload.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setEditingId(null)
    },
  })

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setSelectedClients(new Set())
    },
  })

  const deleteMultiple = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.delete(`/clients/${id}`))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setSelectedClients(new Set())
    },
  })

  const toggleVisible = (clientId: string) => {
    const newSet = new Set(visibleClients)
    if (newSet.has(clientId)) newSet.delete(clientId)
    else newSet.add(clientId)
    setVisibleClients(newSet)
  }

  const startEdit = (client: Client) => {
    setEditForm({
      name: client.name,
      email: client.email || '',
      city: client.city || '',
      state: client.state || '',
      whatsappNumber: client.whatsappNumber,
      address: '',
    })
    setEditingId(client.id)
  }

  const saveEdit = () => {
    if (!editingId) return
    updateClient.mutate({ id: editingId, ...editForm })
  }

  const isVisible = (clientId: string) => showAllData || visibleClients.has(clientId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} clientes cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-64"
          />
          <Button
            variant={showAllData ? 'default' : 'outline'}
            onClick={() => setShowAllData(!showAllData)}
          >
            {showAllData ? <EyeOff size={16} /> : <Eye size={16} />}
            {showAllData ? 'Esconder tudo' : 'Mostrar tudo'}
          </Button>
          {selectedClients.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(`Deletar ${selectedClients.size} cliente(s)?`)) {
                  deleteMultiple.mutate(Array.from(selectedClients))
                }
              }}
              disabled={deleteMultiple.isPending}
            >
              <Trash2 size={16} />
              Deletar {selectedClients.size}
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedClients.size === data?.data.length && (data?.data.length ?? 0) > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClients(new Set(data?.data.map((c) => c.id) ?? []))
                    } else {
                      setSelectedClients(new Set())
                    }
                  }}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((client) => (
              <TableRow key={client.id} className={selectedClients.has(client.id) ? 'bg-blue-50' : ''}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedClients.has(client.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedClients)
                      if (e.target.checked) newSet.add(client.id)
                      else newSet.delete(client.id)
                      setSelectedClients(newSet)
                    }}
                    className="rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {isVisible(client.id) ? formatPhone(client.whatsappNumber) : obfuscatePhone(client.whatsappNumber)}
                </TableCell>
                <TableCell className="text-xs">
                  {client.email ? (isVisible(client.id) ? client.email : obfuscateEmail(client.email)) : '—'}
                </TableCell>
                <TableCell>{client.city && client.state ? `${client.city}/${client.state}` : '—'}</TableCell>
                <TableCell>{new Date(client.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisible(client.id)}
                    title={isVisible(client.id) ? 'Esconder' : 'Mostrar'}
                  >
                    {isVisible(client.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(client)}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Deletar ${client.name}?`)) {
                        deleteClient.mutate(client.id)
                      }
                    }}
                    disabled={deleteClient.isPending}
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhum cliente encontrado</p>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
          <span className="px-4 py-2 text-sm text-gray-600">Página {page}</span>
          <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>Próxima</button>
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp</label>
              <Input
                type="tel"
                value={formatPhone(editForm.whatsappNumber)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setEditForm({ ...editForm, whatsappNumber: raw })
                }}
                placeholder="🇧🇷 +55 (16) 9 9123-1234"
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Endereço</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Rua, número, complemento"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Cidade</label>
                <Input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Estado</label>
                <Input
                  value={editForm.state}
                  maxLength={2}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={updateClient.isPending}>
              {updateClient.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
