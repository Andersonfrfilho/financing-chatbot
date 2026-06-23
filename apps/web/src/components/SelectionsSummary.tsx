import { Check, Clock, Edit2 } from 'lucide-react'
import { useValueLabels } from '@/hooks/useCompanySettings'

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
  requestedProduct: '🎯',
  name: '👤',
  cpf: '🔐',
  nascimento: '📅',
  valorImovel: '🏠',
  imovelCond: '🏘️',
  rendaFamiliar: '💰',
  fgts3anos: '📋',
  dependentes: '👨‍👩‍👧',
  jaTemImovel: '🏠',
  construcaoTipo: '🏗️',
  valorTerreno: '🟫',
  valorConstrucao: '🏗️',
  consorcioPara: '🎯',
  valorCarta: '💳',
  consignadoTipo: '👔',
  valorDesejado: '💵',
  consignadoAtivo: '📝',
  imovelQuitado: '✅',
  valorCredito: '💸',
  rendaMensal: '💵',
  cidade: '📍',
  city: '📍',
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
  const { data: valueLabels } = useValueLabels()

  function formatValue(step: string, value: string): string {
    if (!valueLabels) return value
    return valueLabels[step]?.[value.toLowerCase()] ?? value
  }

  const items = Object.values(selections)
    .filter(s => s.value)
    .sort((a, b) => ((a as any).order ?? 999) - ((b as any).order ?? 999))

  const selectedFlow = selections['requestedProduct']?.value
    ? formatValue('requestedProduct', selections['requestedProduct'].value)
    : null

  if (!items.length) return null

  if (compact) {
    return (
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
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
            <span>{formatValue(sel.step, sel.value)}</span>
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-blue-200 dark:border-blue-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">Suas Seleções</h3>
              {selectedFlow && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-tight">{selectedFlow}</p>
              )}
            </div>
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-600 text-white rounded-full">
              {items.length}
            </span>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            {statusCounts.completed > 0 && (
              <div className="flex items-center gap-1 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <Check size={12} />
                {statusCounts.completed}
              </div>
            )}
            {statusCounts.pending > 0 && (
              <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                <Clock size={12} />
                {statusCounts.pending}
              </div>
            )}
            {statusCounts.editing > 0 && (
              <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
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
                ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 shadow-sm'
                : sel.status === 'pending'
                ? 'bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="text-lg leading-none">{getFieldIcon(sel.step)}</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-none">
                {sel.label}
              </p>
              <span className={`flex-shrink-0 text-sm font-semibold leading-none ${
                sel.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                sel.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {sel.status === 'completed' && '✓'}
                {sel.status === 'pending' && '⏳'}
                {sel.status === 'editing' && '✎'}
              </span>
            </div>

            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate text-center" title={sel.value}>
              {formatValue(sel.step, sel.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
