import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { SSE_BASE } from '@/lib/api'

function connect(token: string): EventSource {
  return new EventSource(`${SSE_BASE}/events/stream?token=${encodeURIComponent(token)}`)
}

export function useGlobalSse() {
  const qc = useQueryClient()
  const tokenRef = useRef<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = useAuthStore.getState().token
    if (!token) return
    tokenRef.current = token

    const es = connect(token)
    esRef.current = es

    es.addEventListener('data-changed', () => {
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })

    es.addEventListener('message', () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })

    es.onerror = () => {
      es.close()
      setTimeout(() => {
        if (!tokenRef.current) return
        const newEs = connect(tokenRef.current)
        esRef.current = newEs
        newEs.addEventListener('data-changed', () => {
          qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
          qc.invalidateQueries({ queryKey: ['conversations'] })
        })
      }, 3000)
    }

    return () => {
      es.close()
    }
  }, [qc])
}
