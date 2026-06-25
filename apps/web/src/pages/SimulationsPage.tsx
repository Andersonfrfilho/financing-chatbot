import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { simulations as text } from '@/locales'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button, Input, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHeader, TableRow
} from '@/components/ui'
import { api } from '@/lib/api'
import { FINANCING_LABELS } from '@/lib/constants'
import { useSortableData } from '@/hooks/useSortableData'

type Simulation = {
  id: string
  financingType: string
  requestedAmount: string
  termMonths: number
  createdAt: string
  bankNames?: string | null
}

const formatBRL = (v: string | number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function SimulationsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [financingType, setFinancingType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = debouncedSearch || financingType || startDate || endDate
  const clearFilters = () => {
    setSearch('')
    setFinancingType('')
    setStartDate('')
    setEndDate('')
  }

  const { data, isLoading } = useQuery<{ data: Simulation[]; total: number }>({
    queryKey: ['simulations', debouncedSearch, financingType, startDate, endDate, page, limit],
    queryFn: () => api.get('/simulations', {
      params: {
        search: debouncedSearch || undefined,
        financingType: financingType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Simulation>(data?.data, 'createdAt')

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{text.subtitle(data?.total ?? 0)}</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder="Buscar WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select value={financingType} onValueChange={(v: string) => { setFinancingType(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Modalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {Object.entries(FINANCING_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="w-full sm:w-36 text-xs"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500">
            <X size={14} />
            <span className="ml-1">Limpar filtros</span>
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Modalidade" field="financingType" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Valor" field="requestedAmount" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Prazo" field="termMonths" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Bancos" field="bankNames" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Data" field="createdAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((sim) => (
              <TableRow key={sim.id}>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                    {FINANCING_LABELS[sim.financingType] ?? sim.financingType}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-sm whitespace-nowrap">{formatBRL(sim.requestedAmount)}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{sim.termMonths} meses</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{sim.bankNames || '—'}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{new Date(sim.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{text.empty}</p>}
      </div>

      {data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Exibir</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>por página</span>
            <span className="ml-2 text-gray-400">({data.total} total)</span>
          </div>
          {data.total > limit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} /> Anterior
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Pág. {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>
                Próxima <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
