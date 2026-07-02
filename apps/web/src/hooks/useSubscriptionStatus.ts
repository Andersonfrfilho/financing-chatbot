import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SubscriptionState = 'active' | 'grace' | 'locked'

export interface SubscriptionStatus {
  state: SubscriptionState
  paidUntil: string | null
  graceDays: number
  graceUntil: string | null
  daysOverdue: number
}

export function useSubscriptionStatus() {
  return useQuery<SubscriptionStatus>({
    queryKey: ['billing', 'status'],
    queryFn: () => api.get('/billing/status').then((r: any) => r.data),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
