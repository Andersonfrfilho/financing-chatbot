import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type User = {
  id: string
  name: string
  email: string
  active: boolean
  createdAt: string
  role: { id: string; name: string }
}

type Role = { id: string; name: string }

export function UsersPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' })
  const qc = useQueryClient()

  const { data } = useQuery<{ data: User[]; total: number }>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r: any) => r.data),
  })

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r: any) => r.data),
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', roleId: '' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usuários</h2>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} usuários cadastrados</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Novo Usuário</button>
      </div>

      {showCreate && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-gray-900 mb-4">Novo Usuário</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" className="w-full border rounded px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                <option value="">Selecione...</option>
                {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={() => createUser.mutate()} disabled={createUser.isPending}>
              {createUser.isPending ? 'Criando...' : 'Criar'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
          </div>
          {createUser.isError && <p className="text-red-600 text-sm mt-2">Erro ao criar usuário.</p>}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nome', 'E-mail', 'Perfil', 'Status', 'Cadastro', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3"><span className="badge bg-blue-100 text-blue-700">{user.role?.name}</span></td>
                <td className="px-4 py-3"><span className={`badge ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive.mutate({ id: user.id, active: !user.active })}
                    className={`text-xs font-medium ${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {user.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhum usuário encontrado</p>
        )}
      </div>
    </div>
  )
}
