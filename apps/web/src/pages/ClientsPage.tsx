import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ['clients', search, page],
    queryFn: () =>
      api.get('/clients', { params: { search: search || undefined, page, limit: 20 } }).then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} clientes cadastrados</p>
        </div>
        <input
          type="search"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nome', 'WhatsApp', 'E-mail', 'Cidade/UF', 'Cadastro'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                <td className="px-4 py-3 text-gray-600">{client.whatsappNumber}</td>
                <td className="px-4 py-3 text-gray-500">{client.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{client.city && client.state ? `${client.city}/${client.state}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</td>
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
    </div>
  )
}
