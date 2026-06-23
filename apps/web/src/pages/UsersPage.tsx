// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2 } from 'lucide-react'
import {
  Button, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui'
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
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', roleId: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', roleId: '' })
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setForm({ name: '', email: '', password: '', passwordConfirm: '', roleId: '' }) },
  })

  const updateUser = useMutation({
    mutationFn: ({ id, name, email, password, roleId }: any) => {
      const payload: any = { name, email, roleId }
      if (password) payload.password = password
      return api.put(`/users/${id}`, payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingId(null) },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const startEdit = (user: User) => {
    setEditForm({ name: user.name, email: user.email, password: '', passwordConfirm: '', roleId: user.role.id })
    setEditingId(user.id)
  }

  const passwordMismatch = (f: typeof form) => f.password && f.passwordConfirm && f.password !== f.passwordConfirm

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Usuários</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} usuários cadastrados</p>
        </div>
        <button className="btn-primary self-start" onClick={() => setShowCreate(true)}>+ Novo Usuário</button>
      </div>

      {/* Formulário de criação */}
      {showCreate && (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-gray-900 mb-4">Novo Usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
              <Input type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <Select value={form.roleId} onValueChange={(v: string) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {passwordMismatch(form) && <p className="text-red-600 text-sm mt-2">As senhas não coincidem!</p>}
          {createUser.isError && <p className="text-red-600 text-sm mt-2">Erro ao criar usuário.</p>}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => { if (form.password !== form.passwordConfirm) { alert('As senhas não coincidem!'); return } createUser.mutate() }} disabled={createUser.isPending || !!passwordMismatch(form)}>
              {createUser.isPending ? 'Criando...' : 'Criar'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-sm">{user.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">{user.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                    {user.role?.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(user)} title="Editar">
                      <Edit2 size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: user.id, active: !user.active })} title={user.active ? 'Desativar' : 'Ativar'}>
                      {user.active ? '🔴' : '🟢'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhum usuário encontrado</p>}
      </div>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Nova Senha (deixar vazio para manter)</label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium">Confirmar Senha</label>
              <Input type="password" value={editForm.passwordConfirm} onChange={(e) => setEditForm({ ...editForm, passwordConfirm: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium">Perfil</label>
              <Select value={editForm.roleId} onValueChange={(v: string) => setEditForm({ ...editForm, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {passwordMismatch(editForm) && <p className="text-red-600 text-sm">⚠️ As senhas não coincidem!</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button
              onClick={() => { if (editingId) { if (editForm.password && editForm.password !== editForm.passwordConfirm) { alert('As senhas não coincidem!'); return } updateUser.mutate({ id: editingId, ...editForm }) } }}
              disabled={updateUser.isPending || !!passwordMismatch(editForm)}
            >
              {updateUser.isPending ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
