import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { formatPhone } from '@/lib/phone'

type WaitingConv = { whatsappNumber: string; clientName: string | null }

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function notifyNew(convs: WaitingConv[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  for (const c of convs) {
    const who = c.clientName || formatPhone(c.whatsappNumber)
    new Notification('⏳ Atendimento pendente', {
      body: `${who} está aguardando atendimento`,
      icon: '/favicon.ico',
    })
  }
}

export function useWaitingNotifications(): number {
  const [waitingCount, setWaitingCount] = useState(0)
  const knownRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    requestPermission()

    async function poll() {
      try {
        const r = await api.get('/conversations', { params: { waitingHuman: 'true', limit: 50 } })
        const convs: WaitingConv[] = r.data?.conversations ?? []
        const currentNumbers = new Set(convs.map((c) => c.whatsappNumber))

        if (knownRef.current !== null) {
          const newOnes = convs.filter((c) => !knownRef.current!.has(c.whatsappNumber))
          if (newOnes.length > 0) notifyNew(newOnes)
        }

        knownRef.current = currentNumbers
        setWaitingCount(convs.length)
      } catch { /* silent */ }
    }

    poll()
    const id = setInterval(poll, 10_000)
    const token = localStorage.getItem('auth-token')
    let eventSource: EventSource | null = null
    if (token) {
      eventSource = new EventSource(`${import.meta.env.VITE_API_URL || ''}/api/events/stream?token=${encodeURIComponent(token)}`)
      eventSource.addEventListener('data-changed', () => poll())
    }
    return () => {
      clearInterval(id)
      eventSource?.close()
    }
  }, [])

  return waitingCount
}
