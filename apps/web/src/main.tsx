import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { ToastProvider } from '@/components/Toast'
import { showToast } from '@/lib/toastState'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      if (mutation?.meta?.silent) return
      const status = error?.response?.status
      const data = error?.response?.data
      if (status >= 500) {
        showToast('error', data?.message || `Erro interno do servidor (${status}). Tente novamente.`)
      } else if (status === 401) {
        // handled by axios interceptor
      } else if (status && status >= 400) {
        const code = data?.error
        const message = data?.message || error?.message || 'Erro na requisição'
        if (code === 'WHATSAPP_WINDOW_EXPIRED') {
          showToast('info', 'Janela de 24h expirada. Envie uma mensagem de template para reabrir a conversa.')
        } else if (code === 'WHATSAPP_CONFIG_MISSING') {
          showToast('error', 'WhatsApp não configurado. Verifique as variáveis de ambiente.')
        } else if (code === 'PAYMENT_REQUIRED') {
          showToast('error', message)
          queryClient.invalidateQueries({ queryKey: ['billing', 'status'] })
        } else {
          showToast('error', message)
        }
      }
    },
  }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
