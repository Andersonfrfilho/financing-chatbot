import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
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
    queryFn: () => api.get('/simulations', { params: { page, limit: 20 } }).then((r: any) => r.data),
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Simulações</h2>
        <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} simulações realizadas</p>
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modalidade</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden sm:table-cell">Prazo</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead>Bancos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((sim) => (
              <TableRow key={sim.id}>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                    {FINANCING_LABELS[sim.financingType] ?? sim.financingType}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-sm whitespace-nowrap">{formatBRL(sim.requestedAmount)}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{sim.termMonths} meses</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{new Date(sim.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-sm">{sim.results?.length ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 py-8 text-sm">Nenhuma simulação encontrada</p>}
      </div>

      {data && data.total > 20 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} /> Anterior
          </Button>
          <span className="px-3 py-1.5 text-sm text-gray-600">Pág. {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}>
            Próxima <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
