import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Bank = {
  id: string
  name: string
  code: string
  active: boolean
  openFinanceBaseUrl?: string
}

export function BanksPage() {
  const { data: banks } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => api.get('/banks').then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bancos</h2>
        <p className="text-gray-500 text-sm mt-1">Gerenciamento de instituições financeiras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks?.map((bank) => (
          <div key={bank.id} className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-lg">
              {bank.code.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{bank.name}</p>
              <p className="text-sm text-gray-500">Código: {bank.code}</p>
            </div>
            <span className={`badge ${bank.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {bank.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      {!banks?.length && (
        <p className="text-center text-gray-400 py-12">Nenhum banco cadastrado</p>
      )}
    </div>
  )
}
