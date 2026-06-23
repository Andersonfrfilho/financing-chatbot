import { Check, Clock, Edit2 } from 'lucide-react'

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

const FIELD_ICONS: Record<string, string> = {
  cpf: '🔐',
  city: '📍',
  name: '👤',
  email: '✉️',
  phone: '📱',
  state: '🏙️',
  birthDate: '📅',
  personType: '👥',
  civilStatus: '💍',
  vehicleType: '🚗',
  vehicleBrand: '🏷️',
  financingType: '💰',
  habitationType: '🏠',
  vehicleModel: '🚙',
  installments: '#️⃣',
  downPayment: '💵',
  totalAmount: '💸',
}

function getFieldIcon(step: string): string {
  return FIELD_ICONS[step] || '✓'
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

  const statusCounts = {
    completed: items.filter(s => s.status === 'completed').length,
    pending: items.filter(s => s.status === 'pending').length,
    editing: items.filter(s => s.status === 'editing').length,
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-semibold text-gray-900">Suas Seleções</h3>
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-600 text-white rounded-full">
              {items.length}
            </span>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            {statusCounts.completed > 0 && (
              <div className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full">
                <Check size={12} />
                {statusCounts.completed}
              </div>
            )}
            {statusCounts.pending > 0 && (
              <div className="flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                <Clock size={12} />
                {statusCounts.pending}
              </div>
            )}
            {statusCounts.editing > 0 && (
              <div className="flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                <Edit2 size={12} />
                {statusCounts.editing}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((sel) => (
          <div
            key={sel.step}
            className={`p-3 rounded-lg border-2 transition-all ${
              sel.status === 'completed'
                ? 'bg-white border-green-200 shadow-sm'
                : sel.status === 'pending'
                ? 'bg-white border-yellow-200 shadow-sm'
                : 'bg-white border-blue-200 shadow-sm'
            }`}
          >
            {/* Icon + Status */}
            <div className="flex items-start justify-between mb-2">
              <span className="text-xl">{getFieldIcon(sel.step)}</span>
              <span className={`flex-shrink-0 text-sm font-semibold ${
                sel.status === 'completed' ? 'text-green-600' :
                sel.status === 'pending' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {sel.status === 'completed' && '✓'}
                {sel.status === 'pending' && '⏳'}
                {sel.status === 'editing' && '✎'}
              </span>
            </div>

            {/* Label */}
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {sel.label}
            </p>

            {/* Value */}
            <p className="text-sm font-semibold text-gray-900 truncate" title={sel.value}>
              {sel.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
