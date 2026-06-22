import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

type Client = {
  id: string
  name: string
  whatsappNumber: string
  email?: string
  city?: string
  state?: string
  createdAt: string
}

// Formatadores
const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '').slice(-11)
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
}

const obfuscatePhone = (phone: string) => {
  const formatted = formatPhone(phone)
  // Substitui os últimos 4 dígitos por ****
  return formatted.replace(/\d{4}$/, '****')
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
      api.get('/clients', { params: { search: search || undefined, page, limit: 20 } }).then((r) => r.data),
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
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => setShowAllData(!showAllData)}
            className="px-3 py-2 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
          >
            {showAllData ? <EyeOff size={16} /> : <Eye size={16} />}
            {showAllData ? 'Esconder tudo' : 'Mostrar tudo'}
          </button>
          {selectedClients.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Deletar ${selectedClients.size} cliente(s)?`)) {
                  deleteMultiple.mutate(Array.from(selectedClients))
                }
              }}
              disabled={deleteMultiple.isPending}
              className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              🗑️ Deletar {selectedClients.size}
            </button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3">
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
              </th>
              {['Nome', 'WhatsApp', 'E-mail', 'Cidade/UF', 'Cadastro', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((client) => (
              <tr key={client.id} className={`hover:bg-gray-50 ${selectedClients.has(client.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
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
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {isVisible(client.id) ? formatPhone(client.whatsappNumber) : obfuscatePhone(client.whatsappNumber)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {client.email ? (isVisible(client.id) ? client.email : obfuscateEmail(client.email)) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{client.city && client.state ? `${client.city}/${client.state}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => toggleVisible(client.id)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                    title={isVisible(client.id) ? 'Esconder' : 'Mostrar'}
                  >
                    {isVisible(client.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => startEdit(client)}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deletar ${client.name}?`)) {
                        deleteClient.mutate(client.id)
                      }
                    }}
                    disabled={deleteClient.isPending}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Editar Cliente</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">WhatsApp</label>
                <input
                  type="tel"
                  value={editForm.whatsappNumber}
                  onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value })}
                  placeholder="55169990000000"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Endereço</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <input
                    type="text"
                    value={editForm.state}
                    maxLength={2}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={updateClient.isPending}
                className="flex-1 px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {updateClient.isPending ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
