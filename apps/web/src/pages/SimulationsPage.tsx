import { useState, useEffect, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { simulations as text } from '@/locales'
import { ChevronLeft, ChevronRight, X, Download, Copy, Check, Filter, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Skeleton, TableSkeleton, SortableHead } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHeader, TableRow
} from '@/components/ui'
import { api } from '@/lib/api'
import { formatPhone, obfuscatePhone } from '@/lib/phone'
import { FINANCING_LABELS } from '@/lib/constants'
import { useSortableData } from '@/hooks/useSortableData'
import { usePrivacyStore } from '@/store/privacyStore'

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

const parseBRL = (s: string) => {
  const cleaned = s.replace(/[^\d,]/g, '').replace(',', '.')
  return cleaned ? Number(cleaned) : undefined
}


const CSV_HEADERS = ['Data', 'Cliente', 'WhatsApp', 'Modalidade', 'Valor Imóvel', 'Valor Financiado', 'Entrada', 'Prazo (meses)', 'Bancos', 'Melhor 1ª Parcela (SAC)']

function rowToCSV(s: Simulation): string[] {
  return [
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
  ]
}

function downloadCSV(rows: Simulation[], filename: string) {
  const lines = rows.map((s) => rowToCSV(s).map((v) => `"${v}"`).join(','))
  const csv = [CSV_HEADERS.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function copyToClipboard(rows: Simulation[]) {
  const lines = [CSV_HEADERS.join('\t'), ...rows.map((s) => rowToCSV(s).join('\t'))]
  navigator.clipboard.writeText(lines.join('\n'))
}

export function SimulationsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [financingType, setFinancingType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minFinancedInput, setMinFinancedInput] = useState('')
  const [maxFinancedInput, setMaxFinancedInput] = useState('')
  const [minTermMonths, setMinTermMonths] = useState('')
  const [maxTermMonths, setMaxTermMonths] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [showValueFilters, setShowValueFilters] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [copiedRows, setCopiedRows] = useState(false)
  const { isPrivate } = usePrivacyStore()
  const [visibleRows, setVisibleRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const minFinanced = parseBRL(minFinancedInput)
  const maxFinanced = parseBRL(maxFinancedInput)

  const hasFilters = debouncedSearch || financingType || startDate || endDate || minFinanced || maxFinanced || minTermMonths || maxTermMonths

  function clearFilters() {
    setSearch('')
    setFinancingType('')
    setStartDate('')
    setEndDate('')
    setMinFinancedInput('')
    setMaxFinancedInput('')
    setMinTermMonths('')
    setMaxTermMonths('')
    setPage(1)
  }

  const { data, isLoading } = useQuery<{ data: Simulation[]; total: number }>({
    queryKey: ['simulations', debouncedSearch, financingType, startDate, endDate, minFinanced, maxFinanced, minTermMonths, maxTermMonths, page, limit],
    queryFn: () => api.get('/simulations', {
      params: {
        search:        debouncedSearch  || undefined,
        financingType: financingType    || undefined,
        startDate:     startDate        || undefined,
        endDate:       endDate          || undefined,
        minFinanced:   minFinanced      ?? undefined,
        maxFinanced:   maxFinanced      ?? undefined,
        minTermMonths: minTermMonths    || undefined,
        maxTermMonths: maxTermMonths    || undefined,
        page,
        limit,
      }
    }).then((r: any) => r.data),
    placeholderData: keepPreviousData,
  })

  const { sorted, sortField, sortDirection, toggleSort } = useSortableData<Simulation>(data?.data, 'createdAt')

  const allIds = useMemo(() => new Set(sorted?.map((s) => s.id) ?? []), [sorted])
  const isAllSelected = allIds.size > 0 && [...allIds].every((id) => selected.has(id))
  const selectedRows = useMemo(() => sorted?.filter((s) => selected.has(s.id)) ?? [], [sorted, selected])
  const exportTarget = selectedRows.length > 0 ? selectedRows : (sorted ?? [])
  const exportLabel = selectedRows.length > 0 ? `${selectedRows.length} selecionada${selectedRows.length > 1 ? 's' : ''}` : 'Todas'

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (isAllSelected) {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.delete(id)); return next })
    } else {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.add(id)); return next })
    }
  }

  function handleCopyPhone(phone: string) {
    navigator.clipboard.writeText(phone)
    setCopiedPhone(phone)
    setTimeout(() => setCopiedPhone(null), 1500)
  }

  function handleCopyRows() {
    copyToClipboard(exportTarget)
    setCopiedRows(true)
    setTimeout(() => setCopiedRows(false), 1500)
  }

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-40 mt-2" /></div>
      <TableSkeleton rows={8} cols={7} />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{text.subtitle(data?.total ?? 0)}</p>
        </div>
        <div className="flex items-center gap-2">
          {exportTarget.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRows}
                className="flex items-center gap-1.5 text-xs"
              >
                {copiedRows ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                Copiar ({exportLabel})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(exportTarget, `simulacoes_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Download size={14} />
                CSV ({exportLabel})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtros principais */}
      <div className="space-y-2">
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
          <Button
            variant={showValueFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowValueFilters((v) => !v)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Filter size={13} />
            Valores / Prazo
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500">
              <X size={14} /><span className="ml-1">Limpar</span>
            </Button>
          )}
        </div>

        {/* Filtros de valor — expansível */}
        {showValueFilters && (
          <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Financiado R$</span>
              <Input
                type="text"
                placeholder="Mín"
                value={minFinancedInput}
                onChange={(e) => { setMinFinancedInput(e.target.value); setPage(1) }}
                className="w-28 text-xs"
              />
              <span className="text-xs text-gray-400">—</span>
              <Input
                type="text"
                placeholder="Máx"
                value={maxFinancedInput}
                onChange={(e) => { setMaxFinancedInput(e.target.value); setPage(1) }}
                className="w-28 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Prazo (meses)</span>
              <Input
                type="number"
                placeholder="Mín"
                value={minTermMonths}
                onChange={(e) => { setMinTermMonths(e.target.value); setPage(1) }}
                className="w-20 text-xs"
                min={6}
                max={420}
              />
              <span className="text-xs text-gray-400">—</span>
              <Input
                type="number"
                placeholder="Máx"
                value={maxTermMonths}
                onChange={(e) => { setMaxTermMonths(e.target.value); setPage(1) }}
                className="w-20 text-xs"
                min={6}
                max={420}
              />
            </div>
          </div>
        )}
      </div>

      {/* Seleção em lote */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <span className="text-blue-700 dark:text-blue-300 font-medium">{selected.size} selecionada{selected.size > 1 ? 's' : ''}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-xs text-blue-600 dark:text-blue-400 h-6 px-2">
            Limpar seleção
          </Button>
        </div>
      )}

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="w-10 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer"
                  title="Selecionar todos desta página"
                />
              </TableCell>
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
            {sorted?.map((sim) => {
              const isSelected = selected.has(sim.id)
              const isRowVisible = !isPrivate || visibleRows.has(sim.id)
              return (
                <TableRow
                  key={sim.id}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  onClick={() => toggleRow(sim.id)}
                >
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(sim.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {sim.clientName ?? '—'}
                      </p>
                      {sim.whatsappNumber && (
                        <button
                          onClick={() => isRowVisible && handleCopyPhone(sim.whatsappNumber!)}
                          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {isRowVisible && (copiedPhone === sim.whatsappNumber ? <Check size={10} className="text-green-500" /> : <Copy size={10} />)}
                          {isRowVisible ? formatPhone(sim.whatsappNumber) : obfuscatePhone(sim.whatsappNumber)}
                          {isPrivate && (
                            <span
                              onClick={(e) => { e.stopPropagation(); setVisibleRows((prev) => { const next = new Set(prev); next.has(sim.id) ? next.delete(sim.id) : next.add(sim.id); return next }) }}
                              className="ml-1 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                              {isRowVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                            </span>
                          )}
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
              )
            })}
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
