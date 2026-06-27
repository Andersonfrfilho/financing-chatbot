import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { simulations as text } from '@/locales'
import { ChevronLeft, ChevronRight, X, Download, Copy, Check } from 'lucide-react'
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
  financedAmount: string | null
  downPaymentAmount: string | null
  termMonths: number
  whatsappNumber: string | null
  clientName: string | null
  createdAt: string
  bankNames?: string | null
  bestRateAnnual?: number | null
  banksCount: number
}

const formatBRL = (v: string | number | null | undefined) =>
  v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits[4]} ${digits.slice(5,9)}-${digits.slice(9)}`
  return phone
}

function exportToCSV(rows: Simulation[]) {
  const headers = ['Data', 'Cliente', 'WhatsApp', 'Modalidade', 'Valor Imóvel', 'Valor Financiado', 'Entrada', 'Prazo (meses)', 'Bancos', 'Melhor 1ª Parcela']
  const lines = rows.map((s) => [
    new Date(s.createdAt).toLocaleDateString('pt-BR'),
    s.clientName ?? '',
    s.whatsappNumber ?? '',
    FINANCING_LABELS[s.financingType] ?? s.financingType,
    Number(s.requestedAmount).toFixed(2),
    Number(s.financedAmount ?? 0).toFixed(2),
    Number(s.downPaymentAmount ?? 0).toFixed(2),
    String(s.termMonths),
    s.bankNames ?? '',
    s.bestRateAnnual ? Number(s.bestRateAnnual).toFixed(2) : '',
  ].map((v) => `"${v}"`).join(','))
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `simulacoes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function SimulationsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [financingType, setFinancingType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [copied, setCopied] = useState<string | null>(null)

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

  function handleCopyPhone(phone: string) {
    navigator.clipboard.writeText(phone)
    setCopied(phone)
    setTimeout(() => setCopied(null), 1500)
  }

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
      <TableSkeleton rows={8} cols={7} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{text.subtitle(data?.total ?? 0)}</p>
        </div>
        {sorted && sorted.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(sorted)}
            className="flex items-center gap-1.5 text-xs shrink-0"
          >
            <Download size={14} />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder="Buscar cliente ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <Select value={financingType} onValueChange={(v: string) => { setFinancingType(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
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
            <span className="ml-1">Limpar</span>
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Data" field="createdAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Cliente" field="clientName" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Modalidade" field="financingType" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Valor Imóvel" field="requestedAmount" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden md:table-cell" />
              <SortableHead label="Financiado" field="financedAmount" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
              <SortableHead label="Entrada" field="downPaymentAmount" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortableHead label="Prazo" field="termMonths" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortableHead label="Bancos" field="bankNames" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden xl:table-cell" />
              <SortableHead label="Melhor 1ª Parcela" field="bestRateAnnual" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="hidden lg:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted?.map((sim) => (
              <TableRow key={sim.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <TableCell className="hidden sm:table-cell text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {sim.clientName ?? '—'}
                    </p>
                    {sim.whatsappNumber && (
                      <button
                        onClick={() => handleCopyPhone(sim.whatsappNumber!)}
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Copiar número"
                      >
                        {copied === sim.whatsappNumber ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        {formatPhone(sim.whatsappNumber)}
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {FINANCING_LABELS[sim.financingType] ?? sim.financingType}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm font-medium whitespace-nowrap">
                  {formatBRL(sim.requestedAmount)}
                </TableCell>
                <TableCell className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  {formatBRL(sim.financedAmount)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                  {formatBRL(sim.downPaymentAmount)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                  {sim.termMonths} meses
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-gray-600 dark:text-gray-400 max-w-[180px] truncate" title={sim.bankNames ?? undefined}>
                  {sim.bankNames ?? '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm font-medium whitespace-nowrap">
                  {sim.bestRateAnnual ? formatBRL(sim.bestRateAnnual) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data?.data.length && <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">{text.empty}</p>}
      </div>

      {data && (
        <div className="flex items-center justify-between flex-wrap gap-3">
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
