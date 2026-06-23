import { useState, useMemo } from 'react'

type SortDirection = 'asc' | 'desc'

export function useSortableData<T extends Record<string, unknown>>(
  data: T[] | undefined,
  defaultField: string,
  defaultDirection: SortDirection = 'desc',
) {
  const [sortField, setSortField] = useState(defaultField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  const sorted = useMemo(() => {
    if (!data) return data
    return [...data].sort((a, b) => {
      const aValue = a[sortField] ?? ''
      const bValue = b[sortField] ?? ''
      const comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortField, sortDirection])

  const toggleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return { sorted, sortField, sortDirection, toggleSort }
}
