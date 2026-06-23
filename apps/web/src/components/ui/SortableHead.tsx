import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { TableHead } from './table'

type SortDirection = 'asc' | 'desc'

type Props = {
  label: string
  field: string
  sortField: string
  sortDirection: SortDirection
  onSort: (field: string) => void
  className?: string
}

export function SortableHead({ label, field, sortField, sortDirection, onSort, className = '' }: Props) {
  const active = field === sortField
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1 whitespace-nowrap">
        {label}
        {active
          ? sortDirection === 'asc'
            ? <ChevronUp size={12} className="text-blue-500 flex-shrink-0" />
            : <ChevronDown size={12} className="text-blue-500 flex-shrink-0" />
          : <ChevronsUpDown size={12} className="opacity-30 flex-shrink-0" />
        }
      </span>
    </TableHead>
  )
}
