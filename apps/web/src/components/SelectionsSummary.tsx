interface Selection {
  step: string
  label: string
  value: string
  selectedAt: string
  status: 'completed' | 'pending' | 'editing'
}

interface SelectionsSummaryProps {
  selections: Record<string, Selection>
  compact?: boolean
}

export function SelectionsSummary({ selections, compact = false }: SelectionsSummaryProps) {
  const items = Object.values(selections).filter(s => s.value)

  if (!items.length) return null

  if (compact) {
    return (
      <div className="text-xs text-gray-600 space-y-1">
        {items.map((sel) => (
          <div key={sel.step} className="flex items-center gap-2">
            <span className={
              sel.status === 'completed' ? 'text-green-600' :
              sel.status === 'pending' ? 'text-yellow-600' :
              'text-blue-600'
            }>
              {sel.status === 'completed' && '✓'}
              {sel.status === 'pending' && '⏳'}
              {sel.status === 'editing' && '✎'}
            </span>
            <span className="font-medium">{sel.label}:</span>
            <span>{sel.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
      <div className="text-sm font-semibold text-blue-900 mb-2">
        📋 Suas seleções
      </div>
      {items.map((sel) => (
        <div
          key={sel.step}
          className="flex items-start justify-between text-xs mb-2 last:mb-0"
        >
          <div>
            <span className="font-medium text-gray-700">{sel.label}</span>
            <p className="text-gray-600 mt-0.5">{sel.value}</p>
          </div>
          <span className={`shrink-0 ml-2 ${
            sel.status === 'completed' ? 'text-green-600' :
            sel.status === 'pending' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {sel.status === 'completed' && '✓'}
            {sel.status === 'pending' && '⏳'}
            {sel.status === 'editing' && '✎'}
          </span>
        </div>
      ))}
    </div>
  )
}
