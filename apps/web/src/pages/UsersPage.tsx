import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2 } from 'lucide-react'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', roleId: '' })
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

  const updateUser = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name: string; email: string; roleId: string }) =>
      api.put(`/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditingId(null)
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const startEdit = (user: User) => {
    setEditForm({ name: user.name, email: user.email, roleId: user.role.id })
    setEditingId(user.id)
  }

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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                    {user.role?.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </div>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(user)}
                    title="Editar usuário"
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive.mutate({ id: user.id, active: !user.active })}
                  >
                    {user.active ? '🔴' : '🟢'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhum usuário encontrado</p>
        )}
      </div>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
              <label className="text-sm font-medium">Perfil</label>
              <Select value={editForm.roleId} onValueChange={(value: string) => setEditForm({ ...editForm, roleId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingId) {
                  updateUser.mutate({ id: editingId, ...editForm })
                }
              }}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
