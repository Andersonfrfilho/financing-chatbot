import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { SSE_BASE } from '@/lib/api'

function connect(token: string): EventSource {
  return new EventSource(`${SSE_BASE}/events/stream?token=${encodeURIComponent(token)}`)
}

export function useGlobalSse() {
  const queryClient = useQueryClient()
  const tokenRef = useRef<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = useAuthStore.getState().token
    if (!token) return
    tokenRef.current = token

    const eventSource = connect(token)
    eventSourceRef.current = eventSource

    eventSource.addEventListener('data-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    eventSource.addEventListener('message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    eventSource.onerror = () => {
      eventSource.close()
      setTimeout(() => {
        if (!tokenRef.current) return
        const newEventSource = connect(tokenRef.current)
        eventSourceRef.current = newEventSource
        newEventSource.addEventListener('data-changed', () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        })
      }, 3000)
    }

    return () => {
      eventSource.close()
    }
  }, [queryClient])
}
