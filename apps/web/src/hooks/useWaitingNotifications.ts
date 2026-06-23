import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function notify(count: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = count === 1
    ? '1 conversa aguardando atendimento'
    : `${count} conversas aguardando atendimento`
  new Notification('⏳ Atendimento pendente', { body, icon: '/favicon.ico' })
}

export function useWaitingNotifications(): number {
  const [waitingCount, setWaitingCount] = useState(0)
  const prevRef = useRef<number | null>(null)

  useEffect(() => {
    requestPermission()

    async function poll() {
      try {
        const r = await api.get('/conversations', { params: { waitingHuman: 'true', limit: 50 } })
        const current: number = (r.data?.conversations ?? []).length
        if (prevRef.current !== null && current > prevRef.current) {
          notify(current - prevRef.current)
        }
        prevRef.current = current
        setWaitingCount(current)
      } catch { /* silent */ }
    }

    poll()
    const id = setInterval(poll, 20_000)
    return () => clearInterval(id)
  }, [])

  return waitingCount
}
