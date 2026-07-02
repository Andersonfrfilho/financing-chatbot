import { AlertTriangle, Lock } from 'lucide-react'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { billing as text } from '@/locales'

export function SubscriptionBanner() {
  const { data: status } = useSubscriptionStatus()

  if (!status || status.state === 'active') return null

  const graceDaysRemaining = Math.max(status.graceDays - status.daysOverdue, 0)

  if (status.state === 'grace') {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">{text.grace.title}</p>
          <p>{text.grace.message(status.daysOverdue, graceDaysRemaining)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      <Lock size={18} className="flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">{text.locked.title}</p>
        <p>{text.locked.message}</p>
      </div>
    </div>
  )
}
