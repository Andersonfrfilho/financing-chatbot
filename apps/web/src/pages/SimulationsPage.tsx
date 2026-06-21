import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Simulation = {
  id: string
  financingType: string
  requestedAmount: string
  termMonths: number
  createdAt: string
  results?: { bankName: string; amortizationSystem: string; firstInstallment: string; fixedInstallment: string; cetAnnual: string }[]
}

const FINANCING_LABELS: Record<string, string> = {
  imobiliario: 'Imóvel', veiculo: 'Veículo', pessoal: 'Pessoal',
  consignado: 'Consignado', empresa: 'Empresa', equipamento: 'Equipamento', rural: 'Rural',
}

const formatBRL = (v: string | number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function SimulationsPage() {
  const [page, setPage] = useState(1)

  const { data } = useQuery<{ data: Simulation[]; total: number }>({
    queryKey: ['simulations', page],
    queryFn: () => api.get('/simulations', { params: { page, limit: 20 } }).then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Simulações</h2>
        <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} simulações realizadas</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Modalidade', 'Valor Solicitado', 'Prazo', 'Data', 'Resultados'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((sim) => (
              <tr key={sim.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="badge bg-blue-100 text-blue-700">
                    {FINANCING_LABELS[sim.financingType] ?? sim.financingType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatBRL(sim.requestedAmount)}</td>
                <td className="px-4 py-3 text-gray-600">{sim.termMonths} meses</td>
                <td className="px-4 py-3 text-gray-500">{new Date(sim.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-gray-500">{sim.results?.length ?? 0} bancos</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data.length && (
          <p className="text-center text-gray-400 py-8">Nenhuma simulação encontrada</p>
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
